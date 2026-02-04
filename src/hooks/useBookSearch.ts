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

// Extract primary title (before colon/subtitle) for fuzzy matching
function getPrimaryTitle(title: string): string {
  return title.split(':')[0].toLowerCase().trim();
}

// Create dedup key from primary title + primary author
function getDedupeKey(book: GoogleBook): string {
  const title = getPrimaryTitle(book.volumeInfo?.title || '');
  const author = (book.volumeInfo?.authors?.[0] || '').split(',')[0].toLowerCase().trim();
  return `${title}|${author}`;
}

// Check if a book has a valid (non-placeholder) cover
function hasValidCover(book: GoogleBook): boolean {
  const url = book.volumeInfo?.imageLinks?.thumbnail || 
              book.volumeInfo?.imageLinks?.smallThumbnail;
  if (!url || url === '/placeholder.svg' || url.trim() === '') return false;
  
  // Known placeholder URL patterns
  if (url.includes('books.google.com/books/content') && !url.includes('edge=curl')) return false;
  if (url.includes('isbndb.com') && url.includes('nocover')) return false;
  
  return true;
}

// Merge cache results with API results, deduplicating by primary title + author
// Prefers results with valid covers over those without
function mergeSearchResults(cacheItems: GoogleBook[], apiItems: GoogleBook[], query: string): GoogleBook[] {
  const seen = new Map<string, GoogleBook>();
  
  // Process all items, preferring ones with valid covers
  const allItems = [...cacheItems, ...apiItems];
  
  for (const item of allItems) {
    const key = getDedupeKey(item);
    if (!key) continue;
    
    const existing = seen.get(key);
    if (!existing) {
      // First time seeing this book
      seen.set(key, item);
    } else if (!hasValidCover(existing) && hasValidCover(item)) {
      // Replace if current has no cover but new one does
      seen.set(key, item);
    }
    // Otherwise keep the existing one (it either has a cover or both lack covers)
  }
  
  return Array.from(seen.values()).slice(0, 12);
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
      // Step 1: Check our database cache first (fastest, no API quota used)
      const { data: cacheData } = await supabase.functions.invoke('book-cache', {
        body: { query, mode: 'search' }
      });

      const cacheItems: GoogleBook[] = cacheData?.items || [];
      
      // If cache has strong results (1+ with covers), show immediately while fetching more
      if (cacheItems.length > 0) {
        console.log(`Cache hit: ${cacheItems.length} results - showing immediately`);
        setResults(cacheItems);
        
        // If we have 3+ cache results, we're done - no need for API calls
        if (cacheItems.length >= 3) {
          return;
        }
      }

      // Step 2: Try ISBNdb (primary external source) for more options
      const { data, error: fnError } = await supabase.functions.invoke('isbndb-search', {
        body: { query, mode: 'search' }
      });

      // If ISBNdb succeeds, merge with cache results (cache first)
      if (!fnError && !data?.error && data?.items?.length) {
        const merged = mergeSearchResults(cacheItems, data.items, query);
        setResults(merged);
        return;
      }

      // Step 3: Fall back to Google Books + OpenLibrary
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

      // Merge fallback results with cache (cache first)
      const merged = mergeSearchResults(cacheItems, fallbackData?.items || [], query);
      setResults(merged);
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
