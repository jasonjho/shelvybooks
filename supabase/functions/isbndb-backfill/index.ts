import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ISBNdbBook {
  title?: string;
  title_long?: string;
  isbn?: string;
  isbn13?: string;
  authors?: string[];
  publisher?: string;
  pages?: number;
  synopsis?: string;
  subjects?: string[];
  date_published?: string;
  image?: string;
}

interface ISBNdbSearchResponse {
  total?: number;
  books?: ISBNdbBook[];
}

// Clean title by removing series notation for better search matching
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*#\d+[^)]*\)\s*/gi, ' ')
    .replace(/\s*#\d+\s*/gi, ' ')
    .replace(/\s*,?\s*book\s+\d+\s*/gi, ' ')
    .replace(/\s*,?\s*vol\.?\s*\d+\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sleep helper for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search ISBNdb for a book by title and author
async function searchISBNdb(
  title: string, 
  author: string, 
  apiKey: string
): Promise<ISBNdbBook | null> {
  const cleanedTitle = cleanTitle(title);
  const query = encodeURIComponent(`${cleanedTitle} ${author}`);
  
  const url = `https://api2.isbndb.com/books/${query}?pageSize=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 429) {
      console.log('Rate limited by ISBNdb');
      return null;
    }
    
    if (response.status === 404) {
      // Book not found in ISBNdb
      return null;
    }
    
    if (!response.ok) {
      console.log(`ISBNdb error: ${response.status}`);
      return null;
    }
    
    const data: ISBNdbSearchResponse = await response.json();
    
    if (!data.books || data.books.length === 0) {
      return null;
    }
    
    return data.books[0];
  } catch (error) {
    console.error(`ISBNdb fetch error: ${error}`);
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
    const isbndbApiKey = Deno.env.get('ISBNDB_API_KEY');

    if (!isbndbApiKey) {
      return new Response(
        JSON.stringify({ error: 'ISBNDB_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check auth - allow cron (anon JWT) or admin users
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    console.log(`Auth header present: ${!!authHeader}`);
    
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
    
    console.log(`isCronCall: ${isCronCall}`);
    
    if (!isCronCall) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: isAdmin } = await supabaseAuth.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Admin access required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Admin ${user.id} triggered ISBNdb backfill`);
    } else {
      console.log('Cron triggered ISBNdb backfill');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find books missing metadata that haven't been attempted via ISBNdb yet
    // We use a separate column to track ISBNdb attempts vs Google Books
    const { data: books, error: fetchError } = await supabase
      .from('books')
      .select('id, title, author, page_count, isbn, description, categories')
      .is('isbndb_attempted_at', null)
      .or('page_count.is.null,isbn.is.null,description.is.null,categories.is.null')
      .limit(3);

    if (fetchError) {
      throw new Error(`Failed to fetch books: ${fetchError.message}`);
    }

    if (!books || books.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All books have been processed', processed: 0, remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${books.length} books via ISBNdb`);

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const book of books) {
      try {
        const isbndbBook = await searchISBNdb(book.title, book.author, isbndbApiKey);
        
        const updateData: Record<string, unknown> = {
          isbndb_attempted_at: new Date().toISOString(),
        };

        if (isbndbBook) {
          // Only update fields that are currently null
          if (!book.page_count && isbndbBook.pages) {
            updateData.page_count = isbndbBook.pages;
          }
          if (!book.isbn && (isbndbBook.isbn13 || isbndbBook.isbn)) {
            updateData.isbn = isbndbBook.isbn13 || isbndbBook.isbn;
          }
          if (!book.description && isbndbBook.synopsis) {
            updateData.description = isbndbBook.synopsis.slice(0, 2000);
          }
          if (!book.categories && isbndbBook.subjects && isbndbBook.subjects.length > 0) {
            updateData.categories = isbndbBook.subjects.slice(0, 5);
          }
          
          if (Object.keys(updateData).length > 1) {
            updated++;
            console.log(`Found: ${book.title}${updateData.isbn ? ` (ISBN: ${updateData.isbn})` : ''}`);
          } else {
            notFound++;
            console.log(`No new data for: ${book.title}`);
          }
        } else {
          notFound++;
          console.log(`Not found: ${book.title}`);
        }

        // Update the book record (marks as attempted even if not found)
        const { error: updateError } = await supabase
          .from('books')
          .update(updateData)
          .eq('id', book.id);

        if (updateError) {
          errors.push(`Update failed for "${book.title}": ${updateError.message}`);
        }

        // Rate limit: 1 request per second for basic plan
        await sleep(1100); // 1.1 seconds to be safe
      } catch (err) {
        errors.push(`Error processing "${book.title}": ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    // Count remaining books
    const { count: remaining } = await supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .is('isbndb_attempted_at', null)
      .or('page_count.is.null,isbn.is.null,description.is.null,categories.is.null');

    return new Response(
      JSON.stringify({
        message: 'ISBNdb backfill batch complete',
        processed: books.length,
        updated,
        notFound,
        remaining: remaining ?? 0,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("ISBNdb backfill error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
