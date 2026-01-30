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

// Search Google Books for metadata
async function fetchGoogleBooksMetadata(title: string, author: string, apiKey?: string): Promise<BookMetadata | null> {
  const query = `intitle:${title} inauthor:${author}`;
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&printType=books`;
  
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const book = data.items?.[0]?.volumeInfo;
    
    if (!book) return null;
    
    const isbn = book.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_13')?.identifier
      || book.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_10')?.identifier;
    
    return {
      pageCount: book.pageCount,
      isbn,
      description: book.description?.slice(0, 2000), // Limit description length
      categories: book.categories?.slice(0, 5),
    };
  } catch {
    return null;
  }
}

// Search Open Library for metadata (fallback)
async function fetchOpenLibraryMetadata(title: string, author: string): Promise<BookMetadata | null> {
  const query = `${title} ${author}`;
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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find books missing metadata for this user
    const { data: books, error: fetchError } = await supabase
      .from('books')
      .select('id, title, author, page_count, isbn, description, categories')
      .eq('user_id', user.id)
      .or('page_count.is.null,isbn.is.null,description.is.null,categories.is.null');

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
    const errors: string[] = [];

    // Process books with rate limiting (avoid API throttling)
    for (const book of books) {
      // Skip if book already has all metadata
      if (book.page_count && book.isbn && book.description && book.categories) {
        continue;
      }

      try {
        // Try Google Books first
        let metadata = await fetchGoogleBooksMetadata(book.title, book.author, googleApiKey);
        
        // Fallback to Open Library if Google didn't return enough data
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

        if (metadata && (metadata.pageCount || metadata.isbn || metadata.description || metadata.categories)) {
          // Only update fields that are currently null
          const updateData: Record<string, unknown> = {};
          if (!book.page_count && metadata.pageCount) updateData.page_count = metadata.pageCount;
          if (!book.isbn && metadata.isbn) updateData.isbn = metadata.isbn;
          if (!book.description && metadata.description) updateData.description = metadata.description;
          if (!book.categories && metadata.categories) updateData.categories = metadata.categories;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('books')
              .update(updateData)
              .eq('id', book.id);

            if (updateError) {
              errors.push(`Failed to update "${book.title}": ${updateError.message}`);
            } else {
              updated++;
              console.log(`Updated metadata for: ${book.title}`);
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        errors.push(`Error processing "${book.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Backfill complete`, 
        total: books.length,
        updated,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in backfill-metadata function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
