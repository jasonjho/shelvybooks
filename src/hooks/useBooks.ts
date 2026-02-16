import { useState, useEffect, useCallback } from 'react';
import posthog from 'posthog-js';
import { Book, BookStatus, ShelfSkin, ShelfSettings, ReadingAnimation } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBookAnimations } from '@/contexts/BookAnimationContext';

// Note: Settings are stored server-side only - no localStorage caching

const defaultSettings: ShelfSettings = {
  showPlant: true,
  showBookends: true,
  showAmbientLight: true,
  showWoodGrain: true,
  decorDensity: 'balanced',
  backgroundTheme: 'office',
  readingAnimation: 'pixie-dust',
};

const VALID_READING_ANIMATIONS = new Set<ReadingAnimation>(['glow', 'border', 'pixie-dust', 'none']);
function normalizeReadingAnimation(val: unknown): ReadingAnimation {
  return VALID_READING_ANIMATIONS.has(val as ReadingAnimation) ? (val as ReadingAnimation) : defaultSettings.readingAnimation;
}

function normalizeShelfSkin(value: unknown): ShelfSkin {
  if (value === 'oak' || value === 'walnut' || value === 'white' || value === 'dark') return value;
  // Back-compat if older values ever existed
  if (value === 'ebony') return 'dark';
  return 'oak';
}

function normalizeDecorDensity(value: unknown): ShelfSettings['decorDensity'] {
  if (value === 'minimal' || value === 'balanced' || value === 'cozy') return value;
  return 'balanced';
}

function normalizeBackgroundTheme(value: unknown): ShelfSettings['backgroundTheme'] {
  if (
    value === 'office' ||
    value === 'library' ||
    value === 'cozy' ||
    value === 'space' ||
    value === 'forest' ||
    value === 'ocean' ||
    value === 'sunset' ||
    value === 'lavender'
  ) {
    return value;
  }
  return 'office';
}

export function useBooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markAsAdded, markAsCompleted } = useBookAnimations();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Always start with defaults - DB is sole source of truth for logged-in users
  // Logged-out users always see defaults (no localStorage pollution)
  const [shelfSkin, setShelfSkinState] = useState<ShelfSkin>('oak');
  const [settings, setSettingsState] = useState<ShelfSettings>(defaultSettings);

  // Load shelf appearance from backend for logged-in users
  // This is the ONLY source of truth - no localStorage fallback
  useEffect(() => {
    if (!user) {
      // Reset to defaults when logged out
      setShelfSkinState('oak');
      setSettingsState(defaultSettings);
      return;
    }

    const fetchAppearance = async () => {
      try {
        const { data, error } = await supabase
          .from('shelf_settings')
          .select('shelf_skin, background_theme, decor_density, show_ambient_light, show_bookends, show_plant, show_wood_grain, reading_animation')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        // Ensure a row exists so later updates always work
        let row = data;
        if (!row) {
          const { data: created, error: insertError } = await supabase
            .from('shelf_settings')
            .insert({ user_id: user.id, is_public: true })
            .select('shelf_skin, background_theme, decor_density, show_ambient_light, show_bookends, show_plant, show_wood_grain, reading_animation')
            .single();
          if (insertError) throw insertError;
          row = created;
        }

        setShelfSkinState(normalizeShelfSkin(row.shelf_skin));
        setSettingsState({
          showPlant: row.show_plant ?? defaultSettings.showPlant,
          showBookends: row.show_bookends ?? defaultSettings.showBookends,
          showAmbientLight: row.show_ambient_light ?? defaultSettings.showAmbientLight,
          showWoodGrain: row.show_wood_grain ?? defaultSettings.showWoodGrain,
          decorDensity: normalizeDecorDensity(row.decor_density),
          backgroundTheme: normalizeBackgroundTheme(row.background_theme),
          readingAnimation: normalizeReadingAnimation(row.reading_animation),
        });
      } catch (err) {
        console.error('Error fetching shelf appearance:', err);
        // Keep defaults on error
      }
    };

    fetchAppearance();
  }, [user]);

  // Fetch books from database when user changes
  const fetchBooks = useCallback(async () => {
    if (!user) {
      setBooks([]);
      setLoading(false);
      return;
    }

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
          pageCount: row.page_count || undefined,
          isbn: row.isbn || undefined,
          description: row.description || undefined,
          categories: row.categories || undefined,
        }))
      );
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Settings are persisted to DB only (no localStorage)

  const persistShelfAppearance = useCallback(
    (patch: {
      shelf_skin?: ShelfSkin | null;
      background_theme?: ShelfSettings['backgroundTheme'] | null;
      decor_density?: ShelfSettings['decorDensity'] | null;
      show_ambient_light?: boolean | null;
      show_bookends?: boolean | null;
      show_plant?: boolean | null;
      show_wood_grain?: boolean | null;
      reading_animation?: ReadingAnimation | null;
    }) => {
      if (!user) return;
      // fire-and-forget; UI should stay snappy even if network is slow
      supabase
        .from('shelf_settings')
        .update(patch)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error saving shelf appearance:', error);
        });
    },
    [user]
  );

  const setShelfSkin = useCallback(
    (skin: ShelfSkin) => {
      setShelfSkinState(skin);
      persistShelfAppearance({ shelf_skin: skin });
    },
    [persistShelfAppearance]
  );

  // Enrich book with ISBNdb metadata before saving
  const enrichBook = useCallback(
    async (book: Omit<Book, 'id'>): Promise<Omit<Book, 'id'>> => {
      // Skip enrichment if book already has metadata
      if (book.isbn && book.pageCount && book.description) {
        return book;
      }

      try {
        const { data, error } = await supabase.functions.invoke('enrich-book', {
          body: { title: book.title, author: book.author },
        });

        if (error || !data?.enriched) {
          return book;
        }

        const enrichedData = data.data || {};
        return {
          ...book,
          pageCount: book.pageCount || enrichedData.pageCount,
          isbn: book.isbn || enrichedData.isbn,
          description: book.description || enrichedData.description,
          categories: book.categories || enrichedData.categories,
          // Only use ISBNdb cover if current one is missing or placeholder
          coverUrl: (!book.coverUrl || book.coverUrl.includes('placeholder')) 
            ? (enrichedData.coverUrl || book.coverUrl) 
            : book.coverUrl,
        };
      } catch (err) {
        console.error('Book enrichment failed:', err);
        return book;
      }
    },
    []
  );

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

      // Check for duplicate (case-insensitive title + author match)
      const normalizedTitle = book.title.trim().toLowerCase();
      const normalizedAuthor = book.author.trim().toLowerCase();
      const existingBook = books.find(
        (b) =>
          b.title.trim().toLowerCase() === normalizedTitle &&
          b.author.trim().toLowerCase() === normalizedAuthor
      );

      if (existingBook) {
        toast({
          title: 'Already on your shelf',
          description: `"${book.title}" is already in your library.`,
        });
        return;
      }

      // Enrich with ISBNdb before saving
      const enrichedBook = await enrichBook(book);

      const { data, error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: enrichedBook.title,
          author: enrichedBook.author,
          cover_url: enrichedBook.coverUrl,
          status: enrichedBook.status,
          page_count: enrichedBook.pageCount,
          isbn: enrichedBook.isbn,
          description: enrichedBook.description,
          categories: enrichedBook.categories,
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
          pageCount: data.page_count || undefined,
          isbn: data.isbn || undefined,
          description: data.description || undefined,
          categories: data.categories || undefined,
        },
      ]);

      // Trigger wobble animation
      markAsAdded(data.id);

      posthog.capture('book_added', {
        book_title: enrichedBook.title,
        book_author: enrichedBook.author,
        status: enrichedBook.status,
      });

      toast({
        title: 'Book added',
        description: `"${enrichedBook.title}" has been added to your shelf.`,
      });
    },
    [user, toast, markAsAdded, enrichBook]
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
        posthog.capture('book_removed', {
          book_title: bookToRemove.title,
          book_author: bookToRemove.author,
        });
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

      const movedBook = books.find(b => b.id === id);
      setBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, status, completedAt: isNewlyCompleted ? completedAt : book.completedAt } : book))
      );

      posthog.capture('book_status_changed', {
        book_title: movedBook?.title,
        from_status: previousStatus,
        to_status: status,
      });

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

  const getBooksByStatus = useCallback(
    (status: BookStatus) => {
      return books.filter((book) => book.status === status);
    },
    [books]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<ShelfSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...newSettings };
        persistShelfAppearance({
          background_theme: next.backgroundTheme,
          decor_density: next.decorDensity,
          show_ambient_light: next.showAmbientLight,
          show_bookends: next.showBookends,
          show_plant: next.showPlant,
          show_wood_grain: next.showWoodGrain,
          reading_animation: next.readingAnimation,
        });
        return next;
      });
    },
    [persistShelfAppearance]
  );

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
    refetchBooks: fetchBooks,
  };
}
