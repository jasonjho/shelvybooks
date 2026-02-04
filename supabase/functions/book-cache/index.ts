import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CachedBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    categories?: string[];
    pageCount?: number;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
  source: string;
}

// Normalize a database book row to the GoogleBook format for consistency
function normalizeDbBook(book: {
  id: string;
  title: string;
  author: string;
  description?: string | null;
  cover_url?: string | null;
  categories?: string[] | null;
  page_count?: number | null;
  isbn?: string | null;
}): CachedBook {
  return {
    id: `cache-${book.id}`,
    volumeInfo: {
      title: book.title,
      authors: book.author ? [book.author] : undefined,
      description: book.description || undefined,
      imageLinks: book.cover_url ? {
        thumbnail: book.cover_url,
        smallThumbnail: book.cover_url,
      } : undefined,
      categories: book.categories || undefined,
      pageCount: book.page_count || undefined,
      industryIdentifiers: book.isbn ? [
        { type: book.isbn.length === 13 ? 'ISBN_13' : 'ISBN_10', identifier: book.isbn }
      ] : undefined,
    },
    source: 'cache',
  };
}

// Score how well a book matches the query (for ranking)
function scoreMatch(book: { title: string; author: string }, query: string): number {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTitle = book.title.toLowerCase().trim();
  const normalizedAuthor = book.author.toLowerCase().trim();
  
  // Exact title match
  if (normalizedTitle === normalizedQuery) return 100;
  
  // Title starts with query
  if (normalizedTitle.startsWith(normalizedQuery)) return 90;
  
  // Query matches author exactly
  if (normalizedAuthor === normalizedQuery) return 85;
  
  // Title contains query as complete phrase
  if (normalizedTitle.includes(normalizedQuery)) return 70;
  
  // Author contains query
  if (normalizedAuthor.includes(normalizedQuery)) return 60;
  
  // All query words appear in title or author
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  const combined = `${normalizedTitle} ${normalizedAuthor}`;
  const matchingWords = queryWords.filter(word => combined.includes(word));
  
  if (matchingWords.length === queryWords.length) return 50;
  if (matchingWords.length > 0) return 30 * (matchingWords.length / queryWords.length);
  
  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ items: [], source: 'cache', error: 'Missing Supabase configuration' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to bypass RLS (we want to search ALL books as a global cache)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { query, isbn, mode = 'search' } = body;

    // Mode: 'search' for title/author search, 'isbn' for direct ISBN lookup
    if (mode === 'isbn' && isbn) {
      // Direct ISBN lookup
      const { data: books, error } = await supabase
        .from('books')
        .select('id, title, author, description, cover_url, categories, page_count, isbn')
        .eq('isbn', isbn)
        .not('cover_url', 'is', null)
        .neq('cover_url', '')
        .limit(1);

      if (error) {
        console.error('Cache ISBN lookup error:', error);
        return new Response(
          JSON.stringify({ items: [], source: 'cache' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!books || books.length === 0) {
        return new Response(
          JSON.stringify({ items: [], source: 'cache', miss: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          items: books.map(normalizeDbBook), 
          source: 'cache',
          hit: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Title/author search
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ items: [], source: 'cache', error: 'Query required' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedQuery = query.slice(0, 200).trim();
    
    if (sanitizedQuery.length < 2) {
      return new Response(
        JSON.stringify({ items: [], source: 'cache' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Cache searching for:', sanitizedQuery);

    // Search books table with ILIKE for fuzzy matching
    // Only return books with good metadata (has cover_url)
    const searchPattern = `%${sanitizedQuery}%`;
    
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, author, description, cover_url, categories, page_count, isbn')
      .or(`title.ilike.${searchPattern},author.ilike.${searchPattern}`)
      .not('cover_url', 'is', null)
      .neq('cover_url', '')
      .limit(50); // Get more so we can dedupe and rank

    if (error) {
      console.error('Cache search error:', error);
      return new Response(
        JSON.stringify({ items: [], source: 'cache' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!books || books.length === 0) {
      return new Response(
        JSON.stringify({ items: [], source: 'cache', miss: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by title + author (case insensitive)
    const seen = new Map<string, typeof books[0]>();
    for (const book of books) {
      const key = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
      // Keep the one with more metadata
      const existing = seen.get(key);
      if (!existing || 
          (book.description && !existing.description) ||
          (book.isbn && !existing.isbn)) {
        seen.set(key, book);
      }
    }

    // Score and sort by relevance
    const uniqueBooks = Array.from(seen.values());
    const scoredBooks = uniqueBooks.map(book => ({
      book,
      score: scoreMatch(book, sanitizedQuery)
    }));
    
    scoredBooks.sort((a, b) => b.score - a.score);
    
    // Return top 12 results
    const topBooks = scoredBooks.slice(0, 12).map(({ book }) => normalizeDbBook(book));
    
    console.log(`Cache returning ${topBooks.length} results (from ${books.length} raw matches)`);

    return new Response(
      JSON.stringify({ 
        items: topBooks, 
        source: 'cache',
        hit: topBooks.length > 0,
        total: topBooks.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in book-cache function:", errorMessage);
    return new Response(
      JSON.stringify({ items: [], source: 'cache', error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
