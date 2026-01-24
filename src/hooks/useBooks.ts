import { useState, useEffect } from 'react';
import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';

const STORAGE_KEY = 'bookshelf-books';
const SKIN_KEY = 'bookshelf-skin';
const SETTINGS_KEY = 'bookshelf-settings';

const defaultSettings: ShelfSettings = {
  showPlant: true,
  showBookends: true,
  showAmbientLight: true,
  showWoodGrain: true,
};

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [shelfSkin, setShelfSkin] = useState<ShelfSkin>(() => {
    const stored = localStorage.getItem(SKIN_KEY);
    return (stored as ShelfSkin) || 'oak';
  });

  const [settings, setSettings] = useState<ShelfSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(SKIN_KEY, shelfSkin);
  }, [shelfSkin]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const addBook = (book: Omit<Book, 'id'>) => {
    const newBook: Book = {
      ...book,
      id: crypto.randomUUID(),
    };
    setBooks((prev) => [...prev, newBook]);
  };

  const removeBook = (id: string) => {
    setBooks((prev) => prev.filter((book) => book.id !== id));
  };

  const moveBook = (id: string, status: BookStatus) => {
    setBooks((prev) =>
      prev.map((book) => (book.id === id ? { ...book, status } : book))
    );
  };

  const getBooksByStatus = (status: BookStatus) => {
    return books.filter((book) => book.status === status);
  };

  const updateSettings = (newSettings: Partial<ShelfSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return {
    books,
    shelfSkin,
    setShelfSkin,
    settings,
    updateSettings,
    addBook,
    removeBook,
    moveBook,
    getBooksByStatus,
  };
}
