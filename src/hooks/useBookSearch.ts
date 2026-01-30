import { useState, useCallback } from 'react';
import { GoogleBook } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCoverUrl } from '@/lib/normalizeCoverUrl';

export function useBookSearch() {
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBooks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use ISBNdb for all book searches
      const { data, error: fnError } = await supabase.functions.invoke('isbndb-search', {
        body: { query, mode: 'search' }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to search books');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchBooks,
    clearResults,
  };
}

export function getCoverUrl(book: GoogleBook): string {
  const thumbnail = book.volumeInfo?.imageLinks?.thumbnail || 
                    book.volumeInfo?.imageLinks?.smallThumbnail;
  
  if (!thumbnail) {
    return '/placeholder.svg';
  }
  
  // Normalize the cover URL (works for both ISBNdb and Google Books)
  return normalizeCoverUrl(
    thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
  );
}

// Fetch cover URL for a book by title and author using ISBNdb
export async function fetchCoverUrl(title: string, author: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('isbndb-search', {
      body: { query: `${title} ${author}`, mode: 'search' }
    });
    
    if (error || !data?.items?.[0]) return '';
    
    return getCoverUrl(data.items[0]);
  } catch {
    return '';
  }
}
