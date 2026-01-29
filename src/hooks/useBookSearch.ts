import { useState, useCallback } from 'react';
import { GoogleBook } from '@/types/book';

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
      // Use intitle: prefix for better title matching
      const searchQuery = `intitle:${query}`;
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=12&printType=books`
      );

      if (!response.ok) {
        throw new Error('Failed to search books');
      }

      const data = await response.json();
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
  // Google Books returns HTTP URLs, convert to HTTPS
  const thumbnail = book.volumeInfo?.imageLinks?.thumbnail || 
                    book.volumeInfo?.imageLinks?.smallThumbnail;
  
  if (!thumbnail) {
    return '/placeholder.svg';
  }
  
  // Replace HTTP with HTTPS and increase zoom for better quality
  return thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
}

// Fetch cover URL for a book by title and author
export async function fetchCoverUrl(title: string, author: string): Promise<string> {
  try {
    const query = `intitle:${title} inauthor:${author}`;
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&printType=books`
    );
    
    if (!response.ok) return '';
    
    const data = await response.json();
    const book = data.items?.[0];
    
    if (!book) return '';
    
    return getCoverUrl(book);
  } catch {
    return '';
  }
}
