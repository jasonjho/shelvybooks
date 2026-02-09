import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

interface EnrichmentResult {
  pageCount?: number;
  isbn?: string;
  description?: string;
  categories?: string[];
  coverUrl?: string;
  source?: 'isbndb' | 'google' | 'openlibrary';
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

// Strip HTML tags from text
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
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Search Google Books for full metadata (FALLBACK)
interface GoogleBooksResult {
  coverUrl?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
  isbn?: string;
}

async function searchGoogleBooks(title: string, author: string, apiKey?: string): Promise<GoogleBooksResult | null> {
  const query = `${title} ${author}`;
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
  
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  console.log(`Google Books fallback: searching for "${query}"`);

  try {
    const response = await fetch(url);
    console.log(`Google Books response status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`Google Books error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const items = data.items || [];
    console.log(`Google Books found ${items.length} results`);
    
    for (const book of items) {
      const volumeInfo = book.volumeInfo;
      if (!volumeInfo) continue;
      
      const result: GoogleBooksResult = {};
      
      // Get cover
      const thumbnail = volumeInfo.imageLinks?.thumbnail;
      if (thumbnail) {
        const httpsThumb = thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
        try {
          const u = new URL(httpsThumb);
          if (u.hostname === 'books.google.com' && u.pathname.startsWith('/books/content')) {
            if (!u.searchParams.get('edge')) u.searchParams.set('edge', 'curl');
            const zoom = u.searchParams.get('zoom');
            if (!zoom || zoom === '1') u.searchParams.set('zoom', '2');
            result.coverUrl = u.toString();
          } else {
            result.coverUrl = httpsThumb;
          }
        } catch {
          result.coverUrl = httpsThumb;
        }
      }
      
      // Get page count
      if (volumeInfo.pageCount) {
        result.pageCount = volumeInfo.pageCount;
      }
      
      // Get description
      if (volumeInfo.description) {
        result.description = stripHtml(volumeInfo.description)?.slice(0, 2000);
      }
      
      // Get categories (no limit - store all available)
      if (volumeInfo.categories && volumeInfo.categories.length > 0) {
        result.categories = volumeInfo.categories;
      }
      
      // Get ISBN
      if (volumeInfo.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
        const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
        result.isbn = isbn13?.identifier || isbn10?.identifier;
      }
      
      // Return first book with at least some useful data
      if (result.coverUrl || result.pageCount || result.description) {
        console.log(`Google Books: found usable data for "${volumeInfo.title}"`);
        return result;
      }
    }
    
    console.log('Google Books: no books with usable data found');
  } catch (e) {
    console.error("Google Books error:", e);
  }
  
  return null;
}

// Search Open Library for full metadata (FALLBACK)
interface OpenLibraryResult {
  coverUrl?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
  isbn?: string;
}

async function searchOpenLibrary(title: string, author: string): Promise<OpenLibraryResult | null> {
  const query = `${title} ${author}`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i,first_publish_year,subject,number_of_pages_median,isbn`;
  
  console.log(`Open Library fallback: searching for "${query}"`);

  try {
    const response = await fetch(url);
    console.log(`Open Library response status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`Open Library error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const docs = data.docs || [];
    console.log(`Open Library found ${docs.length} results`);
    
    for (const doc of docs) {
      const result: OpenLibraryResult = {};
      
      // Get cover
      if (doc.cover_i) {
        result.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
      
      // Get page count
      if (doc.number_of_pages_median) {
        result.pageCount = doc.number_of_pages_median;
      }
      
      // Get categories (no limit - store all available)
      if (doc.subject && doc.subject.length > 0) {
        result.categories = doc.subject;
      }
      
      // Get ISBN
      if (doc.isbn && doc.isbn.length > 0) {
        result.isbn = doc.isbn[0];
      }
      
      // Return first doc with at least some useful data
      if (result.coverUrl || result.pageCount) {
        console.log(`Open Library: found usable data for "${doc.title}"`);
        return result;
      }
    }
    
    console.log('Open Library: no books with usable data found');
  } catch (e) {
    console.error("Open Library error:", e);
  }
  
  return null;
}

async function searchISBNdb(
  title: string, 
  author: string, 
  apiKey: string
): Promise<ISBNdbBook | null> {
  const cleanedTitle = cleanTitle(title);
  const query = encodeURIComponent(`${cleanedTitle} ${author}`);
  
  const url = `https://api2.isbndb.com/books/${query}?pageSize=5`;
  
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
    
    // Try to find best match by comparing titles
    const normalizedTitle = cleanedTitle.toLowerCase();
    const bestMatch = data.books.find(book => {
      const bookTitle = (book.title || book.title_long || '').toLowerCase();
      return bookTitle.includes(normalizedTitle) || normalizedTitle.includes(bookTitle);
    });
    
    return bestMatch || data.books[0];
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
    // Verify auth (gateway can't validate ES256 JWTs, so we check here)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { error: authError } = await supabase.auth.getUser();
    if (authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isbndbApiKey = Deno.env.get('ISBNDB_API_KEY');

    if (!isbndbApiKey) {
      // Return empty result if ISBNdb not configured - graceful degradation
      console.log('ISBNDB_API_KEY not configured, skipping enrichment');
      return new Response(
        JSON.stringify({ success: true, enriched: false, data: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { title, author } = body;

    // Validate input
    if (!title || typeof title !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeTitle = title.slice(0, 200).trim();
    const safeAuthor = (author || 'Unknown').slice(0, 100).trim();

    console.log(`Enriching: "${safeTitle}" by ${safeAuthor}`);

    const isbndbBook = await searchISBNdb(safeTitle, safeAuthor, isbndbApiKey);

    const result: EnrichmentResult = {};

    if (isbndbBook) {
      result.source = 'isbndb';
      
      if (isbndbBook.pages) {
        result.pageCount = isbndbBook.pages;
      }
      
      if (isbndbBook.isbn13 || isbndbBook.isbn) {
        result.isbn = isbndbBook.isbn13 || isbndbBook.isbn;
      }
      
      if (isbndbBook.synopsis || isbndbBook.overview) {
        result.description = stripHtml(isbndbBook.synopsis || isbndbBook.overview)?.slice(0, 2000);
      }
      
      if (isbndbBook.subjects && isbndbBook.subjects.length > 0) {
        result.categories = isbndbBook.subjects;
      }

      // Use ISBNdb cover if available
      if (isbndbBook.image && !isbndbBook.image.includes('placeholder')) {
        result.coverUrl = isbndbBook.image;
      }
    }

    // If ISBNdb didn't return full metadata, try Google Books as fallback
    if (!result.pageCount || !result.description || !result.coverUrl) {
      const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
      const googleData = await searchGoogleBooks(safeTitle, safeAuthor, googleApiKey);
      if (googleData) {
        // Fill in missing fields from Google Books
        if (!result.pageCount && googleData.pageCount) {
          result.pageCount = googleData.pageCount;
        }
        if (!result.description && googleData.description) {
          result.description = googleData.description;
        }
        if (!result.categories && googleData.categories) {
          result.categories = googleData.categories;
        }
        if (!result.isbn && googleData.isbn) {
          result.isbn = googleData.isbn;
        }
        if (!result.coverUrl && googleData.coverUrl) {
          result.coverUrl = googleData.coverUrl;
        }
        if (!result.source && (googleData.pageCount || googleData.description || googleData.coverUrl)) {
          result.source = 'google';
        }
        console.log('Filled in missing data from Google Books');
      }
    }

    // If still missing data, try Open Library as final fallback
    if (!result.pageCount || !result.coverUrl) {
      const openLibraryData = await searchOpenLibrary(safeTitle, safeAuthor);
      if (openLibraryData) {
        // Fill in missing fields from Open Library
        if (!result.pageCount && openLibraryData.pageCount) {
          result.pageCount = openLibraryData.pageCount;
        }
        if (!result.categories && openLibraryData.categories) {
          result.categories = openLibraryData.categories;
        }
        if (!result.isbn && openLibraryData.isbn) {
          result.isbn = openLibraryData.isbn;
        }
        if (!result.coverUrl && openLibraryData.coverUrl) {
          result.coverUrl = openLibraryData.coverUrl;
        }
        if (!result.source && (openLibraryData.pageCount || openLibraryData.coverUrl)) {
          result.source = 'openlibrary';
        }
        console.log('Filled in missing data from Open Library');
      }
    }

    const hasData = Object.keys(result).filter(k => k !== 'source').length > 0;
    console.log(`Enrichment ${hasData ? 'successful' : 'empty'}:`, hasData ? result : 'no data');

    return new Response(
      JSON.stringify({ 
        success: true, 
        enriched: hasData, 
        data: result 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Enrich book error:", errorMessage);
    
    // Return success with empty data on error - don't block book addition
    return new Response(
      JSON.stringify({ success: true, enriched: false, data: {}, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
