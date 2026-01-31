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
  coverUrl?: string;
  source?: 'isbndb' | 'google' | 'openlibrary';
}

// Exponential backoff with jitter
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  baseDelay = 500
): Promise<Response | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
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

// Strip HTML tags and decode entities from text
function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

// PRIMARY: Search ISBNdb for metadata
async function fetchISBNdbMetadata(title: string, author: string, apiKey: string): Promise<BookMetadata | null> {
  const cleanedTitle = cleanTitle(title);
  const query = encodeURIComponent(`${cleanedTitle} ${author}`);
  const url = `https://api2.isbndb.com/books/${query}?pageSize=5`;

  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response) return null;
  if (response.status === 404) return null;
  if (!response.ok) {
    console.log(`ISBNdb error: ${response.status}`);
    return null;
  }

  try {
    const data = await response.json();
    const books = data.books || [];
    
    if (books.length === 0) return null;
    
    // Find best match by title comparison
    const normalizedTitle = cleanedTitle.toLowerCase();
    const bestMatch = books.find((book: { title?: string; title_long?: string }) => {
      const bookTitle = (book.title || book.title_long || '').toLowerCase();
      return bookTitle.includes(normalizedTitle) || normalizedTitle.includes(bookTitle);
    }) || books[0];

    const result: BookMetadata = { source: 'isbndb' };
    
    if (bestMatch.pages) result.pageCount = bestMatch.pages;
    if (bestMatch.isbn13 || bestMatch.isbn) result.isbn = bestMatch.isbn13 || bestMatch.isbn;
    if (bestMatch.synopsis || bestMatch.overview) {
      result.description = stripHtml(bestMatch.synopsis || bestMatch.overview)?.slice(0, 2000);
    }
    if (bestMatch.subjects?.length) result.categories = bestMatch.subjects.slice(0, 5);
    if (bestMatch.image && !bestMatch.image.includes('placeholder')) {
      result.coverUrl = bestMatch.image;
    }

    return result;
  } catch (e) {
    console.error('ISBNdb parse error:', e);
    return null;
  }
}

// FALLBACK 1: Search Google Books for metadata
async function fetchGoogleBooksMetadata(title: string, author: string, apiKey?: string): Promise<BookMetadata | null> {
  const cleanedTitle = cleanTitle(title);
  const query = `${cleanedTitle} ${author}`;
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3&printType=books`;
  
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  const response = await fetchWithRetry(url);
  if (!response || !response.ok) return null;
  
  try {
    const data = await response.json();
    const items = data.items || [];
    
    for (const item of items) {
      const book = item.volumeInfo;
      if (!book) continue;
      
      // Only return if we got useful data
      if (book.pageCount || book.description || book.categories?.length) {
        const isbn = book.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_13')?.identifier
          || book.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_10')?.identifier;
        
        const result: BookMetadata = { source: 'google' };
        if (book.pageCount) result.pageCount = book.pageCount;
        if (isbn) result.isbn = isbn;
        if (book.description) result.description = book.description.slice(0, 2000);
        if (book.categories?.length) result.categories = book.categories.slice(0, 5);
        
        // Get cover if available
        const thumbnail = book.imageLinks?.thumbnail;
        if (thumbnail) {
          let coverUrl = thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
          try {
            const u = new URL(coverUrl);
            if (u.hostname === 'books.google.com' && u.pathname.startsWith('/books/content')) {
              if (!u.searchParams.get('edge')) u.searchParams.set('edge', 'curl');
              const zoom = u.searchParams.get('zoom');
              if (!zoom || zoom === '1') u.searchParams.set('zoom', '2');
              coverUrl = u.toString();
            }
          } catch {
            // ignore URL parse errors
          }
          result.coverUrl = coverUrl;
        }
        
        return result;
      }
    }
  } catch {
    // ignore
  }
  
  return null;
}

// FALLBACK 2: Search Open Library for metadata
async function fetchOpenLibraryMetadata(title: string, author: string): Promise<BookMetadata | null> {
  const cleanedTitle = cleanTitle(title);
  const query = `${cleanedTitle} ${author}`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3&fields=key,title,author_name,number_of_pages_median,isbn,subject,cover_i`;

  const response = await fetchWithRetry(url);
  if (!response || !response.ok) return null;
  
  try {
    const data = await response.json();
    const docs = data.docs || [];
    
    for (const doc of docs) {
      const result: BookMetadata = { source: 'openlibrary' };
      
      if (doc.number_of_pages_median) result.pageCount = doc.number_of_pages_median;
      if (doc.isbn?.[0]) result.isbn = doc.isbn[0];
      if (doc.subject?.length) result.categories = doc.subject.slice(0, 5);
      if (doc.cover_i) {
        result.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
      
      if (result.pageCount || result.isbn || result.categories?.length || result.coverUrl) {
        return result;
      }
    }
  } catch {
    // ignore
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const isbndbApiKey = Deno.env.get('ISBNDB_API_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');

    // Check if this is a cron job call
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    let isCronCall = false;
    try {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payload = JSON.parse(atob(payloadBase64));
        console.log(`JWT payload: role=${payload.role}, ref=${payload.ref}`);
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
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body for options
    let refreshCovers = false;
    let batchSize = 100; // ISBNdb allows 3 req/sec, 100 books with 350ms delay = ~35 seconds
    
    try {
      const body = await req.json();
      refreshCovers = body.refreshCovers === true;
      if (body.batchSize && typeof body.batchSize === 'number') {
        batchSize = Math.min(body.batchSize, 150); // Cap at 150 to stay within timeout
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Find books needing attention
    // If refreshCovers is true, also include books with missing/placeholder covers
    let query = supabase
      .from('books')
      .select('title, author, cover_url');
    
    if (refreshCovers) {
      // Books needing metadata OR missing covers
      query = query.or(
        'isbndb_attempted_at.is.null,' +
        'cover_url.is.null,' +
        'cover_url.eq.,' +
        'cover_url.eq./placeholder.svg'
      );
    } else {
      // Only books not yet attempted by ISBNdb
      query = query.is('isbndb_attempted_at', null);
    }

    const { data: books, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch books: ${fetchError.message}`);
    }

    if (!books || books.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All books already processed', updated: 0, uniqueBooksProcessed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by title+author (case-insensitive)
    const seen = new Set<string>();
    const deduped: Array<{ title: string; author: string; needsCover: boolean }> = [];
    for (const book of books) {
      const key = `${book.title.toLowerCase()}|||${book.author.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        const needsCover = !book.cover_url || book.cover_url === '' || book.cover_url === '/placeholder.svg';
        deduped.push({ title: book.title, author: book.author, needsCover });
      }
    }

    const batch = deduped.slice(0, batchSize);

    console.log(`Found ${books.length} books needing attention, ${deduped.length} unique. Processing batch of ${batch.length}. ISBNdb: ${isbndbApiKey ? 'configured' : 'NOT configured'}`);

    let updated = 0;
    let coversUpdated = 0;
    let noDataFound = 0;
    const errors: string[] = [];
    const notFound: string[] = [];

    for (const book of batch) {
      try {
        let metadata: BookMetadata | null = null;

        // PRIMARY: Try ISBNdb first
        if (isbndbApiKey) {
          metadata = await fetchISBNdbMetadata(book.title, book.author, isbndbApiKey);
          if (metadata) console.log(`ISBNdb found: ${book.title}`);
        }

        // FALLBACK 1: Google Books
        if (!metadata || (!metadata.coverUrl && book.needsCover)) {
          const googleMeta = await fetchGoogleBooksMetadata(book.title, book.author, googleApiKey);
          if (googleMeta) {
            if (!metadata) {
              metadata = googleMeta;
              console.log(`Google Books found: ${book.title}`);
            } else if (!metadata.coverUrl && googleMeta.coverUrl) {
              metadata.coverUrl = googleMeta.coverUrl;
              console.log(`Google Books cover fallback: ${book.title}`);
            }
          }
        }

        // FALLBACK 2: Open Library
        if (!metadata || (!metadata.coverUrl && book.needsCover)) {
          const olMeta = await fetchOpenLibraryMetadata(book.title, book.author);
          if (olMeta) {
            if (!metadata) {
              metadata = olMeta;
              console.log(`Open Library found: ${book.title}`);
            } else if (!metadata.coverUrl && olMeta.coverUrl) {
              metadata.coverUrl = olMeta.coverUrl;
              console.log(`Open Library cover fallback: ${book.title}`);
            }
          }
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          isbndb_attempted_at: new Date().toISOString(),
        };

        let hasNewData = false;
        if (metadata) {
          if (metadata.pageCount) { updateData.page_count = metadata.pageCount; hasNewData = true; }
          if (metadata.isbn) { updateData.isbn = metadata.isbn; hasNewData = true; }
          if (metadata.description) { updateData.description = metadata.description; hasNewData = true; }
          if (metadata.categories) { updateData.categories = metadata.categories; hasNewData = true; }
          if (metadata.coverUrl) { updateData.cover_url = metadata.coverUrl; hasNewData = true; }
        }

        // Update ALL matching books with this title+author
        const { error: updateError, count } = await supabase
          .from('books')
          .update(updateData)
          .ilike('title', book.title)
          .ilike('author', book.author);

        if (updateError) {
          errors.push(`Failed to update "${book.title}": ${updateError.message}`);
        } else if (hasNewData) {
          updated += count || 1;
          if (metadata?.coverUrl) coversUpdated += count || 1;
          console.log(`Updated ${count} copies of: ${book.title} [${metadata?.source}]${metadata?.isbn ? ` ISBN: ${metadata.isbn}` : ''}`);
        } else {
          noDataFound++;
          notFound.push(`${book.title} by ${book.author}`);
          console.log(`No metadata found for: ${book.title} by ${book.author}`);
        }

        // Rate limiting: ISBNdb allows 3 req/sec, use 350ms to be safe
        await sleep(350);
      } catch (err) {
        errors.push(`Error processing "${book.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const remaining = deduped.length - batch.length;

    return new Response(
      JSON.stringify({ 
        message: `Backfill complete`, 
        uniqueBooksProcessed: batch.length,
        totalBooksUpdated: updated,
        coversUpdated,
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
