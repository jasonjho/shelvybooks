import { useState, useCallback } from 'react';
import { Book, BookStatus } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';

export interface CollectionBook {
  key: string;
  title: string;
  author: string;
  coverUrl: string | null;
  openLibraryKey: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  query: string; // Google Books search query or special identifier
  icon: string;
  isNYT?: boolean; // Flag for NYT API collections
}

// Curated collections - improved queries for better results
export const COLLECTIONS: Collection[] = [
  {
    id: 'bestsellers',
    name: 'Bestsellers',
    description: 'Current NYT bestselling fiction',
    query: 'combined-print-and-e-book-fiction',
    icon: '⭐',
    isNYT: true,
  },
  {
    id: 'classics',
    name: 'Classics',
    description: 'Timeless literary masterpieces',
    query: 'subject:classic literature',
    icon: '📚',
  },
  {
    id: 'sci-fi',
    name: 'Science Fiction',
    description: 'Explore the universe of imagination',
    query: 'subject:science fiction',
    icon: '🚀',
  },
  {
    id: 'mystery',
    name: 'Mystery & Thriller',
    description: 'Page-turning suspense',
    query: 'subject:mystery',
    icon: '🔍',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Epic magical adventures',
    query: 'subject:fantasy fiction',
    icon: '🐉',
  },
  {
    id: 'romance',
    name: 'Romance',
    description: 'Stories of love and connection',
    query: 'subject:romance',
    icon: '💕',
  },
];

interface NYTBook {
  key: string;
  title: string;
  author: string;
  coverUrl: string | null;
  amazonUrl?: string;
  description?: string;
}

export function useOpenLibraryCollections() {
  const [loadingCollection, setLoadingCollection] = useState<string | null>(null);
  const [collectionBooks, setCollectionBooks] = useState<Record<string, CollectionBook[]>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchNYTBestsellers = useCallback(async (listName: string): Promise<CollectionBook[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('nyt-bestsellers', {
        body: { listName },
      });

      if (error) {
        console.error('NYT API error:', error);
        throw new Error(error.message || 'Failed to fetch bestsellers');
      }

      if (!data?.success || !data?.books) {
        throw new Error(data?.error || 'No books returned');
      }

      return data.books.map((book: NYTBook) => ({
        key: book.key,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        openLibraryKey: book.amazonUrl || book.key,
      }));
    } catch (err) {
      console.error('Error fetching NYT bestsellers:', err);
      throw err;
    }
  }, []);

  const fetchGoogleBooks = useCallback(async (query: string, limit: number): Promise<CollectionBook[]> => {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&printType=books&orderBy=relevance`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch collection');
    }

    const data = await response.json();
    
    return (data.items || [])
      .filter((item: { volumeInfo: { authors?: string[] } }) => item.volumeInfo.authors?.length > 0)
      .map((item: {
        id: string;
        volumeInfo: {
          title: string;
          authors?: string[];
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
          };
          infoLink?: string;
        };
      }) => {
        const thumbnail = item.volumeInfo.imageLinks?.thumbnail || 
                         item.volumeInfo.imageLinks?.smallThumbnail;
        
        return {
          key: item.id,
          title: item.volumeInfo.title,
          author: item.volumeInfo.authors?.[0] || 'Unknown Author',
          coverUrl: thumbnail 
            ? thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
            : null,
          openLibraryKey: item.volumeInfo.infoLink || item.id,
        };
      });
  }, []);

  const fetchCollection = useCallback(async (collection: Collection, limit: number = 12) => {
    // Return cached if available
    if (collectionBooks[collection.id]) {
      return collectionBooks[collection.id];
    }

    setLoadingCollection(collection.id);
    setError(null);

    try {
      let books: CollectionBook[];

      if (collection.isNYT) {
        books = await fetchNYTBestsellers(collection.query);
      } else {
        books = await fetchGoogleBooks(collection.query, limit);
      }

      // Filter out books without covers for better display
      const booksWithCovers = books.filter(book => book.coverUrl);
      const finalBooks = booksWithCovers.length >= 6 ? booksWithCovers : books;

      setCollectionBooks(prev => ({
        ...prev,
        [collection.id]: finalBooks.slice(0, limit),
      }));

      return finalBooks.slice(0, limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
      return [];
    } finally {
      setLoadingCollection(null);
    }
  }, [collectionBooks, fetchNYTBestsellers, fetchGoogleBooks]);

  const convertToBook = useCallback((
    collectionBook: CollectionBook,
    status: BookStatus = 'want-to-read'
  ): Omit<Book, 'id'> => {
    return {
      title: collectionBook.title,
      author: collectionBook.author,
      coverUrl: collectionBook.coverUrl || '',
      status,
      openLibraryKey: collectionBook.openLibraryKey,
    };
  }, []);

  return {
    collections: COLLECTIONS,
    loadingCollection,
    collectionBooks,
    error,
    fetchCollection,
    convertToBook,
  };
}
