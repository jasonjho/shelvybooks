import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  overview?: string;
  subjects?: string[];
  date_published?: string;
  image?: string;
}

interface ISBNdbSearchResponse {
  total?: number;
  books?: ISBNdbBook[];
  book?: ISBNdbBook;
}

// Strip HTML tags from text
function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'")  // Replace &#39; with '
    .replace(/\s+/g, ' ')    // Collapse multiple spaces
    .trim();
}

// Normalize ISBNdb response to a common format matching Google Books structure
function normalizeBook(book: ISBNdbBook, index: number): {
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
} {
  const description = stripHtml(book.synopsis || book.overview);
  const isbn = book.isbn13 || book.isbn;
  
  return {
    id: `isbndb-${isbn || index}`,
    volumeInfo: {
      title: book.title_long || book.title || 'Unknown Title',
      authors: book.authors,
      description: description?.slice(0, 2000),
      imageLinks: book.image ? {
        thumbnail: book.image,
        smallThumbnail: book.image,
      } : undefined,
      publishedDate: book.date_published,
      categories: book.subjects?.slice(0, 5),
      pageCount: book.pages,
      industryIdentifiers: isbn ? [
        { type: isbn.length === 13 ? 'ISBN_13' : 'ISBN_10', identifier: isbn }
      ] : undefined,
    },
    source: 'isbndb',
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ISBNDB_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ISBNDB_API_KEY not configured", items: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { query, isbn, mode = 'search' } = body;

    // Mode: 'search' for title/author search, 'isbn' for direct ISBN lookup
    // 'batch' for looking up multiple ISBNs at once
    
    if (mode === 'isbn' && isbn) {
      // Direct ISBN lookup
      const url = `https://api2.isbndb.com/book/${encodeURIComponent(isbn)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ items: [], source: 'isbndb', notFound: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error(`ISBNdb error: ${response.status}`);
        return new Response(
          JSON.stringify({ error: `ISBNdb API error: ${response.status}`, items: [] }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data: ISBNdbSearchResponse = await response.json();
      
      if (!data.book) {
        return new Response(
          JSON.stringify({ items: [], source: 'isbndb' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          items: [normalizeBook(data.book, 0)], 
          source: 'isbndb' 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === 'batch' && Array.isArray(body.isbns)) {
      // Batch lookup - fetch multiple ISBNs
      // Note: This respects rate limits by processing sequentially with delays
      const results: ReturnType<typeof normalizeBook>[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < body.isbns.length; i++) {
        const isbnToLookup = body.isbns[i];
        try {
          const url = `https://api2.isbndb.com/book/${encodeURIComponent(isbnToLookup)}`;
          
          const response = await fetch(url, {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data: ISBNdbSearchResponse = await response.json();
            if (data.book) {
              results.push(normalizeBook(data.book, i));
            }
          } else if (response.status !== 404) {
            errors.push(`ISBN ${isbnToLookup}: ${response.status}`);
          }
          
          // Rate limit: wait between requests (1 req/sec for basic, 333ms for pro)
          if (i < body.isbns.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 350));
          }
        } catch (err) {
          errors.push(`ISBN ${isbnToLookup}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          items: results, 
          source: 'isbndb',
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Title/author search
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ items: [], source: 'isbndb', error: 'Query required' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedQuery = query.slice(0, 200).trim().replace(/[<>'"`;\\]/g, '');
    
    if (sanitizedQuery.length < 2) {
      return new Response(
        JSON.stringify({ items: [], source: 'isbndb' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://api2.isbndb.com/books/${encodeURIComponent(sanitizedQuery)}?pageSize=12`;
    
    console.log("ISBNdb searching for:", sanitizedQuery);

    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // For 403 (subscription/quota) and 404 (not found), return empty results
      // so the client can gracefully fall back to alternative sources
      if (response.status === 403 || response.status === 404) {
        console.error(`ISBNdb error: ${response.status} - returning empty results for fallback`);
        return new Response(
          JSON.stringify({ items: [], source: 'isbndb', unavailable: response.status === 403 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error(`ISBNdb error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `ISBNdb API error: ${response.status}`, items: [] }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: ISBNdbSearchResponse = await response.json();
    
    if (!data.books || data.books.length === 0) {
      return new Response(
        JSON.stringify({ items: [], source: 'isbndb' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedBooks = data.books.map((book, index) => normalizeBook(book, index));
    
    console.log(`ISBNdb returning ${normalizedBooks.length} results`);

    return new Response(
      JSON.stringify({ items: normalizedBooks, source: 'isbndb', total: data.total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in isbndb-search function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, items: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
