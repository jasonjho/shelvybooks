import { useState, useCallback } from 'react';
import { GoogleBook } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCoverUrl } from '@/lib/normalizeCoverUrl';

// Convert technical error messages to user-friendly ones
function getUserFriendlyError(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Rate limit / quota errors
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return 'Search is temporarily busy. Please try again in a moment.';
  }
  
  // API quota / forbidden errors
  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden') || lowerMessage.includes('quota')) {
    return 'Search service is temporarily unavailable. Please try again later.';
  }
  
  // Edge function errors
  if (lowerMessage.includes('edge function') || lowerMessage.includes('non 2xx')) {
    return 'Unable to search books right now. Please try again.';
  }
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'Connection error. Please check your internet and try again.';
  }
  
  // Generic fallback - don't show technical details
  return 'Something went wrong. Please try again.';
}

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
      // Try ISBNdb first
      const { data, error: fnError } = await supabase.functions.invoke('isbndb-search', {
        body: { query, mode: 'search' }
      });

      // If ISBNdb fails (rate limit, quota, etc.), fall back to book-search (Google + OpenLibrary)
      if (fnError || data?.error || !data?.items?.length) {
        console.log('ISBNdb unavailable, falling back to Google Books + Open Library');
        
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('book-search', {
          body: { query }
        });

        if (fallbackError) {
          throw new Error(getUserFriendlyError(fallbackError.message));
        }

        if (fallbackData?.error) {
          throw new Error(getUserFriendlyError(fallbackData.error));
        }

        setResults(fallbackData?.items || []);
        return;
      }

      setResults(data.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(getUserFriendlyError(message));
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
