import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookResult {
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
    infoLink?: string;
  };
}

// Search Google Books API
async function searchGoogleBooks(query: string, apiKey?: string): Promise<BookResult[]> {
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&printType=books`;
  
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    console.error("Google Books API error:", await response.text());
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

// Search Open Library - better for fiction/novels
async function searchOpenLibrary(query: string): Promise<BookResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,subject`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    console.error("Open Library API error:", await response.text());
    return [];
  }

  const data = await response.json();
  const docs = data.docs || [];
  
  // Convert Open Library format to Google Books format for consistency
  return docs.map((doc: {
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    first_publish_year?: number;
    subject?: string[];
  }) => ({
    id: `ol-${doc.key}`,
    volumeInfo: {
      title: doc.title,
      authors: doc.author_name,
      imageLinks: doc.cover_i ? {
        thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
        smallThumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`,
      } : undefined,
      publishedDate: doc.first_publish_year?.toString(),
      categories: doc.subject?.slice(0, 3),
      infoLink: `https://openlibrary.org${doc.key}`,
    },
  }));
}

// Check if Open Library results have covers
function hasCoveredResults(results: BookResult[]): boolean {
  const withCovers = results.filter(r => r.volumeInfo?.imageLinks?.thumbnail);
  return withCovers.length >= 3;
}

// Merge results, prioritizing ones with covers
function mergeResults(primary: BookResult[], secondary: BookResult[]): BookResult[] {
  const seen = new Set<string>();
  const results: BookResult[] = [];
  
  // Add primary results with covers first
  for (const book of primary) {
    const key = book.volumeInfo?.title?.toLowerCase().trim();
    if (key && !seen.has(key) && book.volumeInfo?.imageLinks?.thumbnail) {
      seen.add(key);
      results.push(book);
    }
  }
  
  // Add secondary results with covers
  for (const book of secondary) {
    const key = book.volumeInfo?.title?.toLowerCase().trim();
    if (key && !seen.has(key) && book.volumeInfo?.imageLinks?.thumbnail) {
      seen.add(key);
      results.push(book);
    }
  }
  
  // Fill remaining slots with results without covers
  for (const book of [...primary, ...secondary]) {
    const key = book.volumeInfo?.title?.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      results.push(book);
    }
    if (results.length >= 12) break;
  }
  
  return results.slice(0, 12);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ items: [], source: 'none' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_BOOKS_API_KEY");
    
    // Search both APIs in parallel
    console.log("Searching for:", query);
    const [googleResults, openLibraryResults] = await Promise.all([
      searchGoogleBooks(query, apiKey),
      searchOpenLibrary(query)
    ]);
    
    console.log(`Google: ${googleResults.length} results, Open Library: ${openLibraryResults.length} results`);
    
    // Merge results, prioritizing books with covers
    // Open Library often has better fiction coverage, Google has better covers
    const mergedResults = mergeResults(openLibraryResults, googleResults);
    
    const source = openLibraryResults.length > 0 && googleResults.length > 0 
      ? 'combined' 
      : openLibraryResults.length > 0 ? 'openlibrary' : 'google';
    
    console.log(`Returning ${mergedResults.length} merged results (source: ${source})`);
    
    return new Response(
      JSON.stringify({ items: mergedResults, source }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in book-search function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
