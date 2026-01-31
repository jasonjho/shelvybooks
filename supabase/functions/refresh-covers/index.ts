import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookToRefresh {
  id: string;
  title: string;
  author: string;
  isbn?: string;
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

// Search ISBNdb for a cover (PRIMARY SOURCE)
async function searchISBNdbCover(title: string, author: string, apiKey: string): Promise<string | null> {
  const cleanedTitle = cleanTitle(title);
  const query = encodeURIComponent(`${cleanedTitle} ${author}`);
  const url = `https://api2.isbndb.com/books/${query}?pageSize=3`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const books = data.books || [];

    // Find first result with a valid cover
    for (const book of books) {
      if (book.image && !book.image.includes('placeholder')) {
        return book.image;
      }
    }
  } catch (e) {
    console.error("ISBNdb error:", e);
  }

  return null;
}

// Search Google Books API for a cover (FALLBACK 1)
async function searchGoogleBooksCover(title: string, author: string, apiKey?: string): Promise<string | null> {
  const query = `${title} ${author}`;
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3&printType=books`;
  
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const items = data.items || [];
    
    // Find first result with a cover
    for (const book of items) {
      const thumbnail = book.volumeInfo?.imageLinks?.thumbnail;
      if (thumbnail) {
        // Convert to HTTPS and improve quality
        const httpsThumb = thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2');

        // Google Books can sometimes serve an "image not available" placeholder unless
        // we request the curl edge variant.
        try {
          const u = new URL(httpsThumb);
          if (u.hostname === 'books.google.com' && u.pathname.startsWith('/books/content')) {
            if (!u.searchParams.get('edge')) u.searchParams.set('edge', 'curl');
            const zoom = u.searchParams.get('zoom');
            if (!zoom || zoom === '1') u.searchParams.set('zoom', '2');
            return u.toString();
          }
        } catch {
          // ignore
        }

        return httpsThumb;
      }
    }
  } catch (e) {
    console.error("Google Books error:", e);
  }
  
  return null;
}

// Search Open Library for a cover (FALLBACK 2)
async function searchOpenLibraryCover(title: string, author: string): Promise<string | null> {
  const query = `${title} ${author}`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3&fields=cover_i`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const docs = data.docs || [];
    
    // Find first result with a cover
    for (const doc of docs) {
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      }
    }
  } catch (e) {
    console.error("Open Library error:", e);
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const isbndbApiKey = Deno.env.get('ISBNDB_API_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const userId = claimsData.claims.sub;

    // Get request body for optional parameters
    let bookIds: string[] | undefined;
    let limit = 50;
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      bookIds = body.bookIds;
      limit = body.limit || 50;
    }

    // Find books that need cover refresh for this user.
    // We do this as two explicit queries (simpler + more reliable than a complex PostgREST `or(...)`).
    let missingQuery = supabase
      .from('books')
      .select('id, title, author')
      .eq('user_id', userId)
      .or('cover_url.is.null,cover_url.eq.,cover_url.eq./placeholder.svg')
      .limit(limit);

    let googleEdgeMissingQuery = supabase
      .from('books')
      .select('id, title, author')
      .eq('user_id', userId)
      .like('cover_url', '%books.google.com/books/content%')
      .not('cover_url', 'like', '%edge=curl%')
      .limit(limit);

    // If specific book IDs provided, only check those
    if (bookIds && bookIds.length > 0) {
      missingQuery = missingQuery.in('id', bookIds);
      googleEdgeMissingQuery = googleEdgeMissingQuery.in('id', bookIds);
    }

    const [{ data: missingBooks, error: missingError }, { data: googleEdgeMissingBooks, error: googleError }] =
      await Promise.all([missingQuery, googleEdgeMissingQuery]);

    const fetchError = missingError || googleError;
    const books = ([...(missingBooks || []), ...(googleEdgeMissingBooks || [])] as BookToRefresh[]);
    
    if (fetchError) {
      console.error("Error fetching books:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Deduplicate by book id
    const seenIds = new Set<string>();
    const booksToRefresh: BookToRefresh[] = [];
    for (const b of books) {
      if (!b?.id || seenIds.has(b.id)) continue;
      seenIds.add(b.id);
      booksToRefresh.push(b);
      if (booksToRefresh.length >= limit) break;
    }
    console.log(`Found ${booksToRefresh.length} books to refresh covers for user ${userId}`);

    const results: { id: string; title: string; coverUrl: string | null; updated: boolean }[] = [];

    // Process books with rate limiting
    for (const book of booksToRefresh) {
      console.log(`Searching cover for: ${book.title} by ${book.author}`);
      
      let coverUrl: string | null = null;
      
      // Try ISBNdb first (PRIMARY)
      if (isbndbApiKey) {
        coverUrl = await searchISBNdbCover(book.title, book.author, isbndbApiKey);
        if (coverUrl) console.log(`Found cover via ISBNdb`);
      }
      
      // Fallback to Google Books
      if (!coverUrl) {
        coverUrl = await searchGoogleBooksCover(book.title, book.author, googleApiKey);
        if (coverUrl) console.log(`Found cover via Google Books`);
      }
      
      // Fallback to Open Library
      if (!coverUrl) {
        coverUrl = await searchOpenLibraryCover(book.title, book.author);
        if (coverUrl) console.log(`Found cover via Open Library`);
      }
      
      if (coverUrl) {
        // Update the book in the database
        const { error: updateError } = await supabase
          .from('books')
          .update({ cover_url: coverUrl })
          .eq('id', book.id);
        
        if (updateError) {
          console.error(`Error updating ${book.title}:`, updateError);
          results.push({ id: book.id, title: book.title, coverUrl: null, updated: false });
        } else {
          console.log(`Updated cover for: ${book.title}`);
          results.push({ id: book.id, title: book.title, coverUrl, updated: true });
        }
      } else {
        console.log(`No cover found for: ${book.title}`);
        results.push({ id: book.id, title: book.title, coverUrl: null, updated: false });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const updatedCount = results.filter(r => r.updated).length;
    console.log(`Refreshed ${updatedCount} of ${booksToRefresh.length} books`);

    return new Response(
      JSON.stringify({ 
        processed: booksToRefresh.length,
        updated: updatedCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in refresh-covers function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
