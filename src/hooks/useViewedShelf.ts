import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Book, BookStatus } from '@/types/book';

export interface ViewedShelfUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
  shareId: string;
}

export interface ViewedShelfState {
  /** Currently viewed user (null = viewing own shelf) */
  viewedUser: ViewedShelfUser | null;
  /** Set to view a friend's shelf */
  viewShelf: (user: ViewedShelfUser) => void;
  /** Return to own shelf */
  clearViewedShelf: () => void;
  /** Is currently viewing someone else's shelf */
  isViewingFriend: boolean;
  /** Books from the viewed shelf (empty if viewing own) */
  viewedBooks: Book[];
  /** Loading state for friend's books */
  loadingViewedBooks: boolean;
}

export function useViewedShelf(): ViewedShelfState {
  const [viewedUser, setViewedUser] = useState<ViewedShelfUser | null>(null);

  const viewShelf = useCallback((user: ViewedShelfUser) => {
    setViewedUser(user);
  }, []);

  const clearViewedShelf = useCallback(() => {
    setViewedUser(null);
  }, []);

  // Fetch books from the viewed shelf
  const { data: viewedBooks = [], isLoading: loadingViewedBooks } = useQuery({
    queryKey: ['viewed-shelf-books', viewedUser?.shareId],
    queryFn: async (): Promise<Book[]> => {
      if (!viewedUser?.shareId) return [];

      const { data, error } = await supabase
        .rpc('get_public_shelf_books', { _share_id: viewedUser.shareId });

      if (error) throw error;

      return (data || []).map((b: {
        id: string;
        title: string;
        author: string;
        color: string;
        status: string;
        cover_url: string | null;
        created_at: string;
        page_count: number | null;
        isbn: string | null;
        description: string | null;
        categories: string[] | null;
      }) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        color: b.color,
        status: b.status as BookStatus,
        coverUrl: b.cover_url || '/placeholder.svg',
        createdAt: b.created_at,
        pageCount: b.page_count ?? undefined,
        isbn: b.isbn ?? undefined,
        description: b.description ?? undefined,
        categories: b.categories ?? undefined,
      }));
    },
    enabled: !!viewedUser?.shareId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isViewingFriend = useMemo(() => viewedUser !== null, [viewedUser]);

  return {
    viewedUser,
    viewShelf,
    clearViewedShelf,
    isViewingFriend,
    viewedBooks,
    loadingViewedBooks,
  };
}
