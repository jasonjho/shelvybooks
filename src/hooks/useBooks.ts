import { useState, useEffect, useCallback } from 'react';
import { Book, BookStatus, ShelfSkin, ShelfSettings } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBookAnimations } from '@/contexts/BookAnimationContext';
import { useCoverRefresh } from '@/hooks/useCoverRefresh';

const SKIN_KEY = 'bookshelf-skin';
const SETTINGS_KEY = 'bookshelf-settings';

const defaultSettings: ShelfSettings = {
  showPlant: true,
  showBookends: true,
  showAmbientLight: true,
  showWoodGrain: true,
  showNameplate: true,
  showStackedBooks: true,
  decorDensity: 'balanced',
  backgroundTheme: 'office',
};

export function useBooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markAsAdded, markAsCompleted } = useBookAnimations();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [shelfSkin, setShelfSkin] = useState<ShelfSkin>(() => {
    const stored = localStorage.getItem(SKIN_KEY);
    return (stored as ShelfSkin) || 'oak';
  });

  const [settings, setSettings] = useState<ShelfSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  // Fetch books from database when user changes
  useEffect(() => {
    if (!user) {
      setBooks([]);
      setLoading(false);
      return;
    }

    const fetchBooks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching books:', error);
        toast({
          title: 'Error loading books',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setBooks(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            author: row.author,
            coverUrl: row.cover_url || '',
            status: row.status as BookStatus,
            openLibraryKey: undefined,
            completedAt: row.completed_at || undefined,
          }))
        );
      }
      setLoading(false);
    };

    fetchBooks();
  }, [user, toast]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(SKIN_KEY, shelfSkin);
  }, [shelfSkin]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const addBook = useCallback(
    async (book: Omit<Book, 'id'>) => {
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save books to your shelf.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: book.title,
          author: book.author,
          cover_url: book.coverUrl,
          status: book.status,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding book:', error);
        toast({
          title: 'Error adding book',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setBooks((prev) => [
        ...prev,
        {
          id: data.id,
          title: data.title,
          author: data.author,
          coverUrl: data.cover_url || '',
          status: data.status as BookStatus,
        },
      ]);

      // Trigger wobble animation
      markAsAdded(data.id);

      toast({
        title: 'Book added',
        description: `"${book.title}" has been added to your shelf.`,
      });
    },
    [user, toast, markAsAdded]
  );

  const removeBook = useCallback(
    async (id: string) => {
      if (!user) return;

      const bookToRemove = books.find((b) => b.id === id);
      const { error } = await supabase.from('books').delete().eq('id', id);

      if (error) {
        console.error('Error removing book:', error);
        toast({
          title: 'Error removing book',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setBooks((prev) => prev.filter((book) => book.id !== id));

      if (bookToRemove) {
        toast({
          title: 'Book removed',
          description: `"${bookToRemove.title}" has been removed from your shelf.`,
        });
      }
    },
    [user, books, toast]
  );

  const moveBook = useCallback(
    async (id: string, status: BookStatus) => {
      if (!user) return;

      const previousStatus = books.find(b => b.id === id)?.status;
      const isNewlyCompleted = status === 'read' && previousStatus !== 'read';
      const completedAt = isNewlyCompleted ? new Date().toISOString() : undefined;

      const updateData: { status: BookStatus; completed_at?: string } = { status };
      if (isNewlyCompleted) {
        updateData.completed_at = completedAt;
      }

      const { error } = await supabase
        .from('books')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error moving book:', error);
        toast({
          title: 'Error moving book',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, status, completedAt: isNewlyCompleted ? completedAt : book.completedAt } : book))
      );

      // Trigger sparkle animation when marked as read
      if (isNewlyCompleted) {
        markAsCompleted(id);
      }
    },
    [user, toast, books, markAsCompleted]
  );

  const updateBookCover = useCallback(
    async (id: string, coverUrl: string) => {
      if (!user || !coverUrl) return;

      const { error } = await supabase
        .from('books')
        .update({ cover_url: coverUrl })
        .eq('id', id);

      if (error) {
        console.error('Error updating book cover:', error);
        return;
      }

      setBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, coverUrl } : book))
      );
    },
    [user]
  );

  const updateBookCompletedAt = useCallback(
    async (id: string, completedAt: string | null) => {
      if (!user) return;

      const { error } = await supabase
        .from('books')
        .update({ completed_at: completedAt })
        .eq('id', id);

      if (error) {
        console.error('Error updating completed date:', error);
        toast({
          title: 'Error updating date',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, completedAt: completedAt || undefined } : book))
      );

      toast({
        title: 'Date updated',
        description: 'Completion date has been updated.',
      });
    },
    [user, toast]
  );

  // Handle cover updates from the auto-refresh hook
  const handleCoverUpdated = useCallback((id: string, coverUrl: string) => {
    setBooks((prev) =>
      prev.map((book) => (book.id === id ? { ...book, coverUrl } : book))
    );
  }, []);

  // Auto-refresh missing covers on load
  const { missingCoverCount, triggerBatchRefresh } = useCoverRefresh(
    books,
    handleCoverUpdated
  );

  const getBooksByStatus = useCallback(
    (status: BookStatus) => {
      return books.filter((book) => book.status === status);
    },
    [books]
  );

  const updateSettings = useCallback((newSettings: Partial<ShelfSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    books,
    loading,
    shelfSkin,
    setShelfSkin,
    settings,
    updateSettings,
    addBook,
    removeBook,
    moveBook,
    updateBookCover,
    updateBookCompletedAt,
    getBooksByStatus,
    missingCoverCount,
    triggerBatchRefresh,
  };
}
