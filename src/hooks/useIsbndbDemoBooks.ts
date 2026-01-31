import { useState, useEffect } from 'react';
import { Book } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import { demoBooks as fallbackDemoBooks } from '@/data/demoBooks';

// Demo book definitions with just ISBN and status - ISBNdb will fill the rest
const DEMO_BOOK_ISBNS = [
  // Currently Reading
  { isbn: '9780593135204', status: 'reading' as const },    // Project Hail Mary
  { isbn: '9780735211292', status: 'reading' as const },    // Atomic Habits
  { isbn: '9780756404741', status: 'reading' as const },    // The Name of the Wind
  { isbn: '9780399590504', status: 'reading' as const },    // Educated
  { isbn: '9780553418026', status: 'reading' as const },    // The Martian
  // Want to Read
  { isbn: '9780441172719', status: 'want-to-read' as const }, // Dune
  { isbn: '9780525559474', status: 'want-to-read' as const }, // The Midnight Library
  { isbn: '9780062316097', status: 'want-to-read' as const }, // Sapiens
  { isbn: '9780765365279', status: 'want-to-read' as const }, // The Way of Kings
  { isbn: '9780374533557', status: 'want-to-read' as const }, // Thinking, Fast and Slow
  { isbn: '9781250301697', status: 'want-to-read' as const }, // The Silent Patient
  { isbn: '9781501160837', status: 'want-to-read' as const }, // Anxious People
  { isbn: '9780316556347', status: 'want-to-read' as const }, // Circe
  // Read
  { isbn: '9780547928227', status: 'read' as const },       // The Hobbit
  { isbn: '9780451524935', status: 'read' as const },       // 1984
  { isbn: '9780060935467', status: 'read' as const },       // To Kill a Mockingbird
  { isbn: '9780743273565', status: 'read' as const },       // The Great Gatsby
  { isbn: '9780141439518', status: 'read' as const },       // Pride and Prejudice
  { isbn: '9780316769488', status: 'read' as const },       // The Catcher in the Rye
  { isbn: '9780060850524', status: 'read' as const },       // Brave New World
  { isbn: '9780544003415', status: 'read' as const },       // The Lord of the Rings
  { isbn: '9780590353427', status: 'read' as const },       // Harry Potter
  { isbn: '9780062315007', status: 'read' as const },       // The Alchemist
  { isbn: '9781451673319', status: 'read' as const },       // Fahrenheit 451
  { isbn: '9780141439570', status: 'read' as const },       // Picture of Dorian Gray
  { isbn: '9780143058144', status: 'read' as const },       // Crime and Punishment
  { isbn: '9780060883287', status: 'read' as const },       // 100 Years of Solitude
  { isbn: '9780451526342', status: 'read' as const },       // Animal Farm
  { isbn: '9780140268867', status: 'read' as const },       // The Odyssey
  { isbn: '9780440180296', status: 'read' as const },       // Slaughterhouse-Five
  { isbn: '9780374528379', status: 'read' as const },       // Brothers Karamazov
  { isbn: '9780141439556', status: 'read' as const },       // Wuthering Heights
  { isbn: '9780141441146', status: 'read' as const },       // Jane Eyre
  { isbn: '9780140449266', status: 'read' as const },       // Count of Monte Cristo
  { isbn: '9780451419439', status: 'read' as const },       // Les Misérables
];

const CACHE_KEY = 'isbndb_demo_books_v2'; // v2: with HTML stripped
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Strip HTML tags and entities from text
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

interface CachedData {
  books: Book[];
  timestamp: number;
}

function getCachedBooks(): Book[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedData = JSON.parse(cached);
    const isExpired = Date.now() - data.timestamp > CACHE_EXPIRY_MS;
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data.books;
  } catch {
    return null;
  }
}

function setCachedBooks(books: Book[]): void {
  try {
    const data: CachedData = {
      books,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function useIsbndbDemoBooks() {
  // Initialize from cache or fallback immediately - no loading state needed
  const initialBooks = getCachedBooks() ?? fallbackDemoBooks;
  const initialSource = getCachedBooks() ? 'isbndb' : 'fallback';
  
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false); // Start as not loading - we have fallback
  const [source, setSource] = useState<'isbndb' | 'fallback'>(initialSource);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFromIsbndb() {
      // If we already have cached books, no need to fetch
      if (getCachedBooks()) {
        console.log('[ISBNdb Demo] Using cached books');
        return;
      }

      try {
        console.log('[ISBNdb Demo] Fetching demo books from ISBNdb...');
        
        // Fetch all ISBNs via batch mode
        const isbns = DEMO_BOOK_ISBNS.map(b => b.isbn);
        
        const { data, error: fnError } = await supabase.functions.invoke('isbndb-search', {
          body: { mode: 'batch', isbns },
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (!data?.items || data.items.length === 0) {
          console.warn('[ISBNdb Demo] No results from ISBNdb, using fallback');
          setSource('fallback');
          setLoading(false);
          return;
        }

        // Map ISBNdb results to Book format
        const isbndbBooks: Book[] = [];
        const isbnToStatus = new Map(DEMO_BOOK_ISBNS.map(b => [b.isbn, b.status]));

        for (const item of data.items) {
          const volumeInfo = item.volumeInfo;
          const isbn = volumeInfo?.industryIdentifiers?.[0]?.identifier;
          const status = isbn ? isbnToStatus.get(isbn) : undefined;

          if (!volumeInfo?.title) continue;

          isbndbBooks.push({
            id: `isbndb-demo-${isbn || isbndbBooks.length}`,
            title: volumeInfo.title,
            author: volumeInfo.authors?.join(', ') || 'Unknown Author',
            coverUrl: volumeInfo.imageLinks?.thumbnail,
            status: status || 'want-to-read',
            createdAt: new Date().toISOString(),
            pageCount: volumeInfo.pageCount,
            isbn: isbn,
            description: stripHtml(volumeInfo.description),
            categories: volumeInfo.categories,
          });
        }

        if (isbndbBooks.length > 0) {
          console.log(`[ISBNdb Demo] Loaded ${isbndbBooks.length} books from ISBNdb`);
          setBooks(isbndbBooks);
          setSource('isbndb');
          setCachedBooks(isbndbBooks);
        } else {
          console.warn('[ISBNdb Demo] No valid books from ISBNdb, using fallback');
          setSource('fallback');
        }
      } catch (err) {
        console.error('[ISBNdb Demo] Error fetching from ISBNdb:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSource('fallback');
      } finally {
        setLoading(false);
      }
    }

    fetchFromIsbndb();
  }, []);

  return { books, loading, source, error };
}
