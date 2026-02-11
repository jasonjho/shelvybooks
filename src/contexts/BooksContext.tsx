import { createContext, useContext, ReactNode } from 'react';
import { useBooks } from '@/hooks/useBooks';
import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';

interface BooksContextType {
  books: Book[];
  loading: boolean;
  shelfSkin: ShelfSkin;
  setShelfSkin: (skin: ShelfSkin) => void;
  settings: ShelfSettings;
  updateSettings: (settings: Partial<ShelfSettings>) => void;
  addBook: (book: Omit<Book, 'id'>) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  moveBook: (id: string, status: BookStatus) => Promise<void>;
  updateBookCover: (id: string, coverUrl: string) => Promise<void>;
  updateBookCompletedAt: (id: string, completedAt: string | null) => Promise<void>;
  getBooksByStatus: (status: BookStatus) => Book[];
  refetchBooks: () => Promise<void>;
}

const BooksContext = createContext<BooksContextType | null>(null);

export function BooksProvider({ children }: { children: ReactNode }) {
  const booksState = useBooks();
  
  return (
    <BooksContext.Provider value={booksState}>
      {children}
    </BooksContext.Provider>
  );
}

export function useBooksContext() {
  const context = useContext(BooksContext);
  if (!context) {
    throw new Error('useBooksContext must be used within a BooksProvider');
  }
  return context;
}
