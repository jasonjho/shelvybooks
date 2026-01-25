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
  subject: string;
  icon: string;
}

// Curated collections using Open Library subjects
export const COLLECTIONS: Collection[] = [
  {
    id: 'classics',
    name: 'Classics',
    description: 'Timeless literary masterpieces',
    subject: 'classic_literature',
    icon: '📚',
  },
  {
    id: 'sci-fi',
    name: 'Science Fiction',
    description: 'Explore the universe of imagination',
    subject: 'science_fiction',
    icon: '🚀',
  },
  {
    id: 'mystery',
    name: 'Mystery & Thriller',
    description: 'Page-turning suspense',
    subject: 'mystery',
    icon: '🔍',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Epic magical adventures',
    subject: 'fantasy',
    icon: '🐉',
  },
  {
    id: 'romance',
    name: 'Romance',
    description: 'Stories of love and connection',
    subject: 'romance',
    icon: '💕',
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    description: 'Explore big ideas',
    subject: 'philosophy',
    icon: '🤔',
  },
];

// Generate a random book color
function generateBookColor(): string {
  const colors = [
    '#8B4513', '#2F4F4F', '#8B0000', '#191970', '#006400',
    '#4A4A4A', '#800020', '#355E3B', '#4B0082', '#8B7355',
    '#C19A6B', '#1C3A63', '#5C4033', '#704241', '#3D5C5C',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

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
        `https://openlibrary.org/subjects/${collection.subject}.json?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await response.json();
      
      const books: CollectionBook[] = data.works?.map((work: {
        key: string;
        title: string;
        authors?: { name: string }[];
        cover_id?: number;
      }) => ({
        key: work.key,
        title: work.title,
        author: work.authors?.[0]?.name || 'Unknown Author',
        coverUrl: work.cover_id 
          ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`
          : null,
        openLibraryKey: work.key,
      })) || [];

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
