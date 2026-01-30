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

    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      
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

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
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
    // This is an admin function - verify with service role or special header
    const authHeader = req.headers.get('Authorization');
    const adminKey = req.headers.get('x-admin-key');
    
    // Only allow if called with service role key or special admin header
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    
    // Simple admin check - in production you'd want something more robust
    if (adminKey !== 'run-backfill-now') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find books missing any key metadata AND not yet attempted
    // Process small batch to complete within timeout
    const { data: books, error: fetchError } = await supabase
      .from('books')
      .select('id, title, author, page_count, isbn, description, categories, metadata_attempted_at')
      .is('metadata_attempted_at', null)
      .or('description.is.null,page_count.is.null,categories.is.null')
      .limit(20); // Small batch for reliability

    if (fetchError) {
      throw new Error(`Failed to fetch books: ${fetchError.message}`);
    }

    if (!books || books.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All books already have metadata', updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${books.length} books needing metadata backfill`);

    let updated = 0;
    let noDataFound = 0;
    const errors: string[] = [];
    const notFound: string[] = [];

    for (const book of books) {
      // Skip if book already has all metadata
      if (book.page_count && book.isbn && book.description && book.categories) {
        continue;
      }

      try {
        // Try Google Books first
        let metadata = await fetchGoogleBooksMetadata(book.title, book.author, googleApiKey);
        
        // Fallback to Open Library
        if (!metadata?.pageCount && !metadata?.isbn) {
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

        // Always mark as attempted (whether we found data or not)
        const updateData: Record<string, unknown> = {
          metadata_attempted_at: new Date().toISOString(),
        };

        if (metadata && (metadata.pageCount || metadata.isbn || metadata.description || metadata.categories)) {
          if (!book.page_count && metadata.pageCount) updateData.page_count = metadata.pageCount;
          if (!book.isbn && metadata.isbn) updateData.isbn = metadata.isbn;
          if (!book.description && metadata.description) updateData.description = metadata.description;
          if (!book.categories && metadata.categories) updateData.categories = metadata.categories;
        }

        const { error: updateError } = await supabase
          .from('books')
          .update(updateData)
          .eq('id', book.id);

        if (updateError) {
          errors.push(`Failed to update "${book.title}": ${updateError.message}`);
        } else if (Object.keys(updateData).length > 1) {
          // More than just metadata_attempted_at was updated
          updated++;
          console.log(`Updated: ${book.title}`);
        } else {
          // Only metadata_attempted_at was set - no data found
          noDataFound++;
          notFound.push(`${book.title} by ${book.author}`);
          console.log(`No metadata found for: ${book.title} by ${book.author}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        errors.push(`Error processing "${book.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Backfill complete`, 
        total: books.length,
        updated,
        noDataFound,
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
