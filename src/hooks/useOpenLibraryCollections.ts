import { useState, useCallback } from 'react';
import { Book, BookStatus } from '@/types/book';

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
  query: string; // Google Books search query
  icon: string;
}

// Curated collections using Google Books queries
export const COLLECTIONS: Collection[] = [
  {
    id: 'classics',
    name: 'Classics',
    description: 'Timeless literary masterpieces',
    query: 'subject:classics',
    icon: '📚',
  },
  {
    id: 'sci-fi',
    name: 'Science Fiction',
    description: 'Explore the universe of imagination',
    query: 'subject:science+fiction',
    icon: '🚀',
  },
  {
    id: 'mystery',
    name: 'Mystery & Thriller',
    description: 'Page-turning suspense',
    query: 'subject:mystery+thriller',
    icon: '🔍',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Epic magical adventures',
    query: 'subject:fantasy',
    icon: '🐉',
  },
  {
    id: 'romance',
    name: 'Romance',
    description: 'Stories of love and connection',
    query: 'subject:romance',
    icon: '💕',
  },
  {
    id: 'bestsellers',
    name: 'Bestsellers',
    description: 'Popular recent reads',
    query: 'bestseller+2024',
    icon: '⭐',
  },
];

export function useOpenLibraryCollections() {
  const [loadingCollection, setLoadingCollection] = useState<string | null>(null);
  const [collectionBooks, setCollectionBooks] = useState<Record<string, CollectionBook[]>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async (collection: Collection, limit: number = 12) => {
    // Return cached if available
    if (collectionBooks[collection.id]) {
      return collectionBooks[collection.id];
    }

    setLoadingCollection(collection.id);
    setError(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(collection.query)}&maxResults=${limit}&printType=books&orderBy=relevance`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await response.json();
      
      const books: CollectionBook[] = (data.items || []).map((item: {
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

      setCollectionBooks(prev => ({
        ...prev,
        [collection.id]: books,
      }));

      return books;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
      return [];
    } finally {
      setLoadingCollection(null);
    }
  }, [collectionBooks]);

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
