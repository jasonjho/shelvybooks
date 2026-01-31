import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    pageCount?: number;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

// Search Google Books API with title-focused query
async function searchGoogleBooks(query: string, apiKey?: string): Promise<BookResult[]> {
  // Use intitle: prefix to prioritize title matches, fall back to regular search
  const titleQuery = `intitle:${query}`;
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(titleQuery)}&maxResults=12&printType=books`;
  
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    console.error("Google Books API error:", await response.text());
    return [];
  }

  const data = await response.json();
  const titleResults = data.items || [];
  
  // If title search returns few results, also do a general search
  if (titleResults.length < 4) {
    let generalUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&printType=books`;
    if (apiKey) {
      generalUrl += `&key=${apiKey}`;
    }
    const generalResponse = await fetch(generalUrl);
    if (generalResponse.ok) {
      const generalData = await generalResponse.json();
      const generalResults = generalData.items || [];
      // Combine, prioritizing title matches
      const seen = new Set(titleResults.map((r: BookResult) => r.id));
      for (const book of generalResults) {
        if (!seen.has(book.id)) {
          titleResults.push(book);
          seen.add(book.id);
        }
      }
    }
  }
  
  return titleResults;
}

// Search Open Library - better for fiction/novels
async function searchOpenLibrary(query: string): Promise<BookResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,subject,number_of_pages_median,isbn`;
  
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
    number_of_pages_median?: number;
    isbn?: string[];
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
      categories: doc.subject?.slice(0, 5),
      infoLink: `https://openlibrary.org${doc.key}`,
      pageCount: doc.number_of_pages_median,
      industryIdentifiers: doc.isbn?.[0] ? [{ type: 'ISBN_13', identifier: doc.isbn[0] }] : undefined,
    },
  }));
}

// Check if Open Library results have covers
function hasCoveredResults(results: BookResult[]): boolean {
  const withCovers = results.filter(r => r.volumeInfo?.imageLinks?.thumbnail);
  return withCovers.length >= 3;
}

// Score how well a book title matches the query (higher = better match)
function scoreTitleMatch(bookTitle: string, query: string): number {
  const normalizedTitle = bookTitle.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Exact match gets highest score
  if (normalizedTitle === normalizedQuery) return 100;
  
  // Title starts with query
  if (normalizedTitle.startsWith(normalizedQuery)) return 80;
  
  // Title contains query as a complete phrase
  if (normalizedTitle.includes(normalizedQuery)) return 60;
  
  // Query words all appear in title
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  const titleWords = normalizedTitle.split(/\s+/);
  const matchingWords = queryWords.filter(qw => 
    titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
  );
  if (matchingWords.length === queryWords.length) return 40;
  
  // Partial word match
  if (matchingWords.length > 0) return 20 * (matchingWords.length / queryWords.length);
  
  return 0;
}

// Merge results, prioritizing exact title matches and ones with covers
function mergeResults(primary: BookResult[], secondary: BookResult[], query: string): BookResult[] {
  const seen = new Set<string>();
  const allBooks: Array<{ book: BookResult; score: number; hasCover: boolean }> = [];
  
  // Score all books
  for (const book of [...primary, ...secondary]) {
    const key = book.volumeInfo?.title?.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      const score = scoreTitleMatch(book.volumeInfo?.title || '', query);
      const hasCover = !!book.volumeInfo?.imageLinks?.thumbnail;
      allBooks.push({ book, score, hasCover });
    }
  }
  
  // Sort by: exact match score (desc), has cover (desc)
  allBooks.sort((a, b) => {
    // First by title match score
    if (b.score !== a.score) return b.score - a.score;
    // Then by cover availability
    if (a.hasCover !== b.hasCover) return a.hasCover ? -1 : 1;
    return 0;
  });
  
  return allBooks.slice(0, 12).map(item => item.book);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Note: Book search is available to all users (authenticated and guests)
    // Rate limiting is handled at the API level via the Google Books API key
    
    const body = await req.json();
    
    // === INPUT VALIDATION ===
    let query = body?.query;
    
    // Type check
    if (typeof query !== 'string') {
      return new Response(
        JSON.stringify({ items: [], source: 'none', error: 'Query must be a string' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Sanitize and limit length
    query = query.slice(0, 200).trim();
    
    if (query.length < 2) {
      return new Response(
        JSON.stringify({ items: [], source: 'none' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Remove potentially dangerous characters for URL injection
    query = query.replace(/[<>'"`;\\]/g, '');

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
    const mergedResults = mergeResults(openLibraryResults, googleResults, query);
    
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
