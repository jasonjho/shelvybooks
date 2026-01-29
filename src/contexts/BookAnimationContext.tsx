import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BookAnimationContextType {
  recentlyAddedBooks: Set<string>;
  recentlyCompletedBooks: Set<string>;
  markAsAdded: (bookId: string) => void;
  markAsCompleted: (bookId: string) => void;
  clearAnimation: (bookId: string) => void;
}

const BookAnimationContext = createContext<BookAnimationContextType | null>(null);

export function BookAnimationProvider({ children }: { children: ReactNode }) {
  const [recentlyAddedBooks, setRecentlyAddedBooks] = useState<Set<string>>(new Set());
  const [recentlyCompletedBooks, setRecentlyCompletedBooks] = useState<Set<string>>(new Set());

  const markAsAdded = useCallback((bookId: string) => {
    setRecentlyAddedBooks(prev => new Set(prev).add(bookId));
    // Auto-clear after animation completes
    setTimeout(() => {
      setRecentlyAddedBooks(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }, 800);
  }, []);

  const markAsCompleted = useCallback((bookId: string) => {
    setRecentlyCompletedBooks(prev => new Set(prev).add(bookId));
    // Auto-clear after animation completes
    setTimeout(() => {
      setRecentlyCompletedBooks(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }, 1000);
  }, []);

  const clearAnimation = useCallback((bookId: string) => {
    setRecentlyAddedBooks(prev => {
      const next = new Set(prev);
      next.delete(bookId);
      return next;
    });
    setRecentlyCompletedBooks(prev => {
      const next = new Set(prev);
      next.delete(bookId);
      return next;
    });
  }, []);

  return (
    <BookAnimationContext.Provider value={{
      recentlyAddedBooks,
      recentlyCompletedBooks,
      markAsAdded,
      markAsCompleted,
      clearAnimation,
    }}>
      {children}
    </BookAnimationContext.Provider>
  );
}

export function useBookAnimations() {
  const context = useContext(BookAnimationContext);
  if (!context) {
    // Return a no-op version if used outside provider
    return {
      recentlyAddedBooks: new Set<string>(),
      recentlyCompletedBooks: new Set<string>(),
      markAsAdded: () => {},
      markAsCompleted: () => {},
      clearAnimation: () => {},
    };
  }
  return context;
}
