import { useCallback, useEffect, useRef } from 'react';
import { Book } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCoverUrl } from '@/hooks/useBookSearch';

/**
 * Hook to automatically refresh missing book covers on load
 * and provide a manual batch refresh function.
 */
export function useCoverRefresh(
  books: Book[],
  onCoverUpdated: (id: string, coverUrl: string) => void
) {
  const { user } = useAuth();
  const refreshedIds = useRef<Set<string>>(new Set());

  // Find books with missing covers that haven't been attempted yet
  const getMissingCoverBooks = useCallback(() => {
    return books.filter(
      (book) =>
        (!book.coverUrl || book.coverUrl === '' || book.coverUrl === '/placeholder.svg') &&
        !refreshedIds.current.has(book.id)
    );
  }, [books]);

  // Auto-refresh on load for books with missing covers
  useEffect(() => {
    if (!user) return;

    const booksToRefresh = getMissingCoverBooks();
    if (booksToRefresh.length === 0) return;

    // Refresh in background, one at a time with delay
    const refreshBooks = async () => {
      for (const book of booksToRefresh) {
        // Mark as attempted to prevent duplicate requests
        refreshedIds.current.add(book.id);

        try {
          const coverUrl = await fetchCoverUrl(book.title, book.author);
          
          if (coverUrl) {
            // Update in database
            const { error } = await supabase
              .from('books')
              .update({ cover_url: coverUrl })
              .eq('id', book.id);

            if (!error) {
              // Notify parent to update local state
              onCoverUpdated(book.id, coverUrl);
            }
          }
        } catch (e) {
          console.error(`Failed to refresh cover for ${book.title}:`, e);
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    // Start background refresh after a short delay to not block initial render
    const timeoutId = setTimeout(refreshBooks, 1000);
    return () => clearTimeout(timeoutId);
  }, [user, getMissingCoverBooks, onCoverUpdated]);

  // Manual batch refresh using edge function
  const triggerBatchRefresh = useCallback(async () => {
    if (!user) return { processed: 0, updated: 0 };

    try {
      const { data, error } = await supabase.functions.invoke('refresh-covers', {
        body: { limit: 100 }
      });

      if (error) {
        console.error('Batch refresh error:', error);
        return { processed: 0, updated: 0 };
      }

      // Update local state for all successfully updated books
      if (data?.results) {
        for (const result of data.results) {
          if (result.updated && result.coverUrl) {
            refreshedIds.current.add(result.id);
            onCoverUpdated(result.id, result.coverUrl);
          }
        }
      }

      return {
        processed: data?.processed || 0,
        updated: data?.updated || 0
      };
    } catch (e) {
      console.error('Batch refresh failed:', e);
      return { processed: 0, updated: 0 };
    }
  }, [user, onCoverUpdated]);

  return {
    missingCoverCount: getMissingCoverBooks().length,
    triggerBatchRefresh,
  };
}
