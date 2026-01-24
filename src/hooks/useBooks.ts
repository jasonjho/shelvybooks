import { useState, useEffect } from 'react';
import { Book, BookStatus, ShelfSkin } from '@/types/book';

const STORAGE_KEY = 'bookshelf-books';
const SKIN_KEY = 'bookshelf-skin';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [shelfSkin, setShelfSkin] = useState<ShelfSkin>(() => {
    const stored = localStorage.getItem(SKIN_KEY);
    return (stored as ShelfSkin) || 'oak';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(SKIN_KEY, shelfSkin);
  }, [shelfSkin]);

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

  return {
    books,
    shelfSkin,
    setShelfSkin,
    addBook,
    removeBook,
    moveBook,
    getBooksByStatus,
  };
}
