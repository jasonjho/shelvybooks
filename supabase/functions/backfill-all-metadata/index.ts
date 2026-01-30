import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookMetadata {
  pageCount?: number;
  isbn?: string;
  description?: string;
  categories?: string[];
}

// Exponential backoff with jitter
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 500
): Promise<Response | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      // If rate limited (429) or server error (5xx), retry with backoff
      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxRetries) {
          console.log(`Max retries reached for ${url}, status: ${response.status}`);
          return null;
        }
        
        // Exponential backoff with jitter: 500ms, 1s, 2s, 4s...
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
        console.log(`Rate limited/error (${response.status}), retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        console.log(`Network error after ${maxRetries} retries: ${error}`);
        return null;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
      console.log(`Network error, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  return null;
}

// Clean title by removing series notation like "(Book #1)", "#2", etc.
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*#\d+[^)]*\)\s*/gi, ' ')  // Remove "(Series Name #1)"
    .replace(/\s*#\d+\s*/gi, ' ')                  // Remove standalone "#1"
    .replace(/\s*,?\s*book\s+\d+\s*/gi, ' ')       // Remove "Book 1" or ", Book 1"
    .replace(/\s*,?\s*vol\.?\s*\d+\s*/gi, ' ')     // Remove "Vol 1" or "Vol. 1"
    .replace(/\s+/g, ' ')                          // Normalize whitespace
    .trim();
}

// Search Google Books for metadata - try multiple query strategies
async function fetchGoogleBooksMetadata(title: string, author: string, apiKey?: string): Promise<BookMetadata | null> {
  const cleanedTitle = cleanTitle(title);
  
  // Try different query strategies in order of specificity
  const queries = [
    `intitle:${cleanedTitle} inauthor:${author}`,
    `"${cleanedTitle}" ${author}`,
    `${cleanedTitle} ${author}`,
  ];

  for (const query of queries) {
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&printType=books`;
    
    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    const response = await fetchWithRetry(url);
    if (!response || !response.ok) continue;
    
    try {
      const data = await response.json();
      const book = data.items?.[0]?.volumeInfo;
      
      if (!book) continue;
      
      // Only return if we got useful data
      if (book.pageCount || book.description || book.categories?.length) {
        const isbn = book.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_13')?.identifier
          || book.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_10')?.identifier;
        
        return {
          pageCount: book.pageCount,
          isbn,
          description: book.description?.slice(0, 2000),
          categories: book.categories?.slice(0, 5),
        };
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

// Search Open Library for metadata (fallback)
async function fetchOpenLibraryMetadata(title: string, author: string): Promise<BookMetadata | null> {
  const cleanedTitle = cleanTitle(title);
  const query = `${cleanedTitle} ${author}`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=key,title,author_name,number_of_pages_median,isbn,subject`;

  const response = await fetchWithRetry(url);
  if (!response || !response.ok) return null;
  
  try {
    const data = await response.json();
    const doc = data.docs?.[0];
    
    if (!doc) return null;
    
    return {
      pageCount: doc.number_of_pages_median,
      isbn: doc.isbn?.[0],
      categories: doc.subject?.slice(0, 5),
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');

    // Check if this is a cron job call - the cron passes anon key JWT in the Authorization header
    // We detect this by checking if the token is a JWT with "anon" role for our project
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    // Decode the JWT payload (base64) to check if it's the anon key
    let isCronCall = false;
    try {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payload = JSON.parse(atob(payloadBase64));
        console.log(`JWT payload: role=${payload.role}, ref=${payload.ref}`);
        // If it's an anon role JWT for our project, it's the cron job
        isCronCall = payload.role === 'anon' && payload.ref === 'gzzkaxivhqqoezfqtpsd';
      }
    } catch (e) {
      console.log(`JWT decode error: ${e}`);
    }
    
    console.log(`Auth check - isCronCall: ${isCronCall}`);
    
    if (isCronCall) {
      console.log('Cron job triggered backfill');
    } else {
      // Verify admin role from JWT token for manual calls
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - No token provided' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use anon key client to verify the user's token
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check admin role using the has_role RPC function
      const { data: isAdmin, error: roleError } = await supabaseAuth.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (roleError || !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin ${user.id} triggered backfill`);
    }
    
    // Use service role for actual database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find UNIQUE title+author combinations that haven't been attempted yet
    // This deduplicates across all users - we only fetch metadata once per unique book
    const { data: uniqueBooks, error: fetchError } = await supabase
      .from('books')
      .select('title, author')
      .is('metadata_attempted_at', null)
      .or('description.is.null,page_count.is.null,categories.is.null,isbn.is.null');

    if (fetchError) {
      throw new Error(`Failed to fetch books: ${fetchError.message}`);
    }

    if (!uniqueBooks || uniqueBooks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All books already have metadata', updated: 0, uniqueBooksProcessed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by title+author (case-insensitive)
    const seen = new Set<string>();
    const deduped: Array<{ title: string; author: string }> = [];
    for (const book of uniqueBooks) {
      const key = `${book.title.toLowerCase()}|||${book.author.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(book);
      }
    }

    // Process larger batch - up to 150 unique books per call
    const batchSize = 150;
    const batch = deduped.slice(0, batchSize);

    console.log(`Found ${uniqueBooks.length} books needing metadata, ${deduped.length} unique title/author combos. Processing batch of ${batch.length}.`);

    let updated = 0;
    let noDataFound = 0;
    const errors: string[] = [];
    const notFound: string[] = [];

    for (const book of batch) {
      try {
        // Try Google Books first
        let metadata = await fetchGoogleBooksMetadata(book.title, book.author, googleApiKey);
        
        // Fallback to Open Library if Google didn't return ISBN
        if (!metadata?.isbn) {
          const olMetadata = await fetchOpenLibraryMetadata(book.title, book.author);
          if (olMetadata) {
            metadata = {
              pageCount: metadata?.pageCount || olMetadata.pageCount,
              isbn: metadata?.isbn || olMetadata.isbn,
              description: metadata?.description,
              categories: metadata?.categories || olMetadata.categories,
            };
          }
        }

        // Build update data - apply to ALL books with this title+author
        const updateData: Record<string, unknown> = {
          metadata_attempted_at: new Date().toISOString(),
        };

        let hasNewData = false;
        if (metadata) {
          if (metadata.pageCount) { updateData.page_count = metadata.pageCount; hasNewData = true; }
          if (metadata.isbn) { updateData.isbn = metadata.isbn; hasNewData = true; }
          if (metadata.description) { updateData.description = metadata.description; hasNewData = true; }
          if (metadata.categories) { updateData.categories = metadata.categories; hasNewData = true; }
        }

        // Update ALL matching books (across all users) with this title+author
        const { error: updateError, count } = await supabase
          .from('books')
          .update(updateData)
          .ilike('title', book.title)
          .ilike('author', book.author)
          .is('metadata_attempted_at', null);

        if (updateError) {
          errors.push(`Failed to update "${book.title}": ${updateError.message}`);
        } else if (hasNewData) {
          updated += count || 1;
          console.log(`Updated ${count} copies of: ${book.title}${updateData.isbn ? ` (ISBN: ${updateData.isbn})` : ''}`);
        } else {
          noDataFound++;
          notFound.push(`${book.title} by ${book.author}`);
          console.log(`No metadata found for: ${book.title} by ${book.author} (marked ${count} copies as attempted)`);
        }

        // Base rate limiting delay between unique books
        await sleep(150);
      } catch (err) {
        errors.push(`Error processing "${book.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Calculate remaining unique books
    const remaining = deduped.length - batch.length;

    return new Response(
      JSON.stringify({ 
        message: `Backfill complete`, 
        uniqueBooksProcessed: batch.length,
        totalBooksUpdated: updated,
        noDataFound,
        remaining,
        notFoundSamples: notFound.slice(0, 5),
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in backfill-all-metadata function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});