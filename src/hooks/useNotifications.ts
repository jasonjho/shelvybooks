import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NewLike {
  id: string;
  bookId: string;
  bookTitle: string;
  likedAt: string;
  username?: string;
  avatarUrl?: string | null;
}

interface NotificationData {
  newLikesCount: number;
  newLikes: NewLike[];
  likesPerBook: Record<string, number>;
  totalLikesPerBook: Record<string, number>;
  lastSeenAt: Date | null;
  markAsSeen: () => Promise<void>;
  isLoading: boolean;
}

export function useNotifications(): NotificationData {
  const { user } = useAuth();
  const [newLikesCount, setNewLikesCount] = useState(0);
  const [newLikes, setNewLikes] = useState<NewLike[]>([]);
  const [likesPerBook, setLikesPerBook] = useState<Record<string, number>>({});
  const [totalLikesPerBook, setTotalLikesPerBook] = useState<Record<string, number>>({});
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get or create notification settings
      let { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!settings) {
        // Create default settings
        const { data: newSettings } = await supabase
          .from('notification_settings')
          .insert({ user_id: user.id })
          .select()
          .single();
        settings = newSettings;
      }

      const lastSeen = settings?.last_seen_likes_at 
        ? new Date(settings.last_seen_likes_at) 
        : new Date(0);
      setLastSeenAt(lastSeen);

      // Get user's books
      const { data: userBooks } = await supabase
        .from('books')
        .select('id, title')
        .eq('user_id', user.id);

      if (!userBooks || userBooks.length === 0) {
        setIsLoading(false);
        return;
      }

      const bookIds = userBooks.map(b => b.id);
      const bookTitleMap = Object.fromEntries(userBooks.map(b => [b.id, b.title]));

      // Get likes on user's books (excluding self-likes)
      const { data: likes } = await supabase
        .from('book_likes')
        .select('id, book_id, created_at, user_id')
        .in('book_id', bookIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!likes) {
        setIsLoading(false);
        return;
      }

      // Count new likes (after last seen)
      const newLikesData = likes.filter(l => new Date(l.created_at) > lastSeen);
      setNewLikesCount(newLikesData.length);

      // Fetch profiles for all likers
      const likerIds = [...new Set(newLikesData.slice(0, 10).map(l => l.user_id))];
      let profilesMap = new Map<string, { username: string; avatar_url: string | null }>();
      
      if (likerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', likerIds);

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap.set(p.user_id, { username: p.username, avatar_url: p.avatar_url });
          });
        }
      }

      // Map to NewLike format with usernames
      setNewLikes(newLikesData.slice(0, 10).map(l => {
        const profile = profilesMap.get(l.user_id);
        return {
          id: l.id,
          bookId: l.book_id,
          bookTitle: bookTitleMap[l.book_id] || 'Unknown Book',
          likedAt: l.created_at,
          username: profile?.username,
          avatarUrl: profile?.avatar_url,
        };
      }));

      // Count new likes per book (for notification badges)
      const perBook: Record<string, number> = {};
      newLikesData.forEach(l => {
        perBook[l.book_id] = (perBook[l.book_id] || 0) + 1;
      });
      setLikesPerBook(perBook);

      // Count ALL likes per book (for heart stickers - persists after mark as read)
      const totalPerBook: Record<string, number> = {};
      likes.forEach(l => {
        totalPerBook[l.book_id] = (totalPerBook[l.book_id] || 0) + 1;
      });
      setTotalLikesPerBook(totalPerBook);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notification_settings')
        .update({ last_seen_likes_at: new Date().toISOString() })
        .eq('user_id', user.id);

      setNewLikesCount(0);
      setNewLikes([]);
      setLikesPerBook({});
      setLastSeenAt(new Date());
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime likes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('likes-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'book_likes',
        },
        () => {
          // Refetch notifications when new like is added
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    newLikesCount,
    newLikes,
    likesPerBook,
    totalLikesPerBook,
    lastSeenAt,
    markAsSeen,
    isLoading,
  };
}
