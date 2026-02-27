import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MysteryBook {
  id: string;
  fromUserId: string;
  toUserId: string;
  moodTag: string;
  teaser: string;
  emojiClue: string;
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string | null;
  description: string | null;
  categories: string[] | null;
  pageCount: number | null;
  status: 'pending' | 'unwrapped' | 'accepted' | 'declined';
  unwrappedAt: string | null;
  respondedAt: string | null;
  reactionEmoji: string | null;
  reactionNote: string | null;
  reactedAt: string | null;
  createdAt: string;
  // Enriched
  fromUsername?: string;
  fromAvatarUrl?: string | null;
  toUsername?: string;
  toAvatarUrl?: string | null;
}

interface UseMysteryBooksResult {
  pendingMysteryBooks: MysteryBook[];
  reactionNotifications: MysteryBook[];
  pendingCount: number;
  isLoading: boolean;
  lastSeenAt: Date | null;
  unwrapMysteryBook: (mysteryBookId: string) => Promise<MysteryBook | null>;
  acceptMysteryBook: (mysteryBook: MysteryBook) => Promise<void>;
  declineMysteryBook: (mysteryBookId: string) => Promise<void>;
  reactToMysteryBook: (mysteryBookId: string, emoji: string, note?: string) => Promise<void>;
  markAsSeen: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMysteryBooks(): UseMysteryBooksResult {
  const { user } = useAuth();
  const [pendingMysteryBooks, setPendingMysteryBooks] = useState<MysteryBook[]>([]);
  const [reactionNotifications, setReactionNotifications] = useState<MysteryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);

  const fetchMysteryBooks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: settings } = await (supabase
        .from('notification_settings')
        .select('last_seen_mystery_books_at') as any)
        .eq('user_id', user.id)
        .single();

      const lastSeen = settings?.last_seen_mystery_books_at
        ? new Date(settings.last_seen_mystery_books_at)
        : new Date(0);
      setLastSeenAt(lastSeen);
      setLastSeenLoaded(true);

      // Fetch mystery books that haven't been fully responded to
      const { data: mysteryBooks, error } = await (supabase
        .from('mystery_books') as any)
        .select('*')
        .eq('to_user_id', user.id)
        .in('status', ['pending', 'unwrapped'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!mysteryBooks || mysteryBooks.length === 0) {
        setPendingMysteryBooks([]);
      } else {
        // Get sender profiles
        const senderIds = [...new Set(mysteryBooks.map((r: any) => r.from_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', senderIds);

        const profilesMap = new Map(
          profiles?.map(p => [p.user_id, { username: p.username, avatarUrl: p.avatar_url }]) || []
        );

        const mapped: MysteryBook[] = mysteryBooks.map((r: any) => {
          const profile = profilesMap.get(r.from_user_id);
          return {
            id: r.id,
            fromUserId: r.from_user_id,
            toUserId: r.to_user_id,
            moodTag: r.mood_tag,
            teaser: r.teaser,
            emojiClue: r.emoji_clue,
            title: r.title,
            author: r.author,
            coverUrl: r.cover_url,
            isbn: r.isbn,
            description: r.description,
            categories: r.categories,
            pageCount: r.page_count,
            status: r.status,
            unwrappedAt: r.unwrapped_at,
            respondedAt: r.responded_at,
            reactionEmoji: r.reaction_emoji,
            reactionNote: r.reaction_note,
            reactedAt: r.reacted_at,
            createdAt: r.created_at,
            fromUsername: profile?.username,
            fromAvatarUrl: profile?.avatarUrl,
          };
        });

        setPendingMysteryBooks(mapped);
      }

      // Also fetch mystery books I SENT that have reactions (for sender notifications)
      const { data: reactedBooks, error: reactedError } = await (supabase
        .from('mystery_books') as any)
        .select('*')
        .eq('from_user_id', user.id)
        .not('reaction_emoji', 'is', null)
        .gt('reacted_at', lastSeen.toISOString())
        .order('reacted_at', { ascending: false });

      if (!reactedError && reactedBooks && reactedBooks.length > 0) {
        // Get recipient profiles
        const recipientIds = [...new Set(reactedBooks.map((r: any) => r.to_user_id))];
        const { data: recipientProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', recipientIds);

        const recipientMap = new Map(
          recipientProfiles?.map(p => [p.user_id, { username: p.username, avatarUrl: p.avatar_url }]) || []
        );

        const mappedReactions: MysteryBook[] = reactedBooks.map((r: any) => {
          const recipientProfile = recipientMap.get(r.to_user_id);
          return {
            id: r.id,
            fromUserId: r.from_user_id,
            toUserId: r.to_user_id,
            moodTag: r.mood_tag,
            teaser: r.teaser,
            emojiClue: r.emoji_clue,
            title: r.title,
            author: r.author,
            coverUrl: r.cover_url,
            isbn: r.isbn,
            description: r.description,
            categories: r.categories,
            pageCount: r.page_count,
            status: r.status,
            unwrappedAt: r.unwrapped_at,
            respondedAt: r.responded_at,
            reactionEmoji: r.reaction_emoji,
            reactionNote: r.reaction_note,
            reactedAt: r.reacted_at,
            createdAt: r.created_at,
            toUsername: recipientProfile?.username,
            toAvatarUrl: recipientProfile?.avatarUrl,
          };
        });
        setReactionNotifications(mappedReactions);
      } else {
        setReactionNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching mystery books:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const unwrapMysteryBook = useCallback(async (mysteryBookId: string): Promise<MysteryBook | null> => {
    if (!user) return null;

    try {
      const { error } = await (supabase
        .from('mystery_books') as any)
        .update({
          status: 'unwrapped',
          unwrapped_at: new Date().toISOString(),
        })
        .eq('id', mysteryBookId);

      if (error) throw error;

      // Update local state and return updated mystery book
      let unwrapped: MysteryBook | null = null;
      setPendingMysteryBooks(prev => prev.map(mb => {
        if (mb.id === mysteryBookId) {
          unwrapped = { ...mb, status: 'unwrapped', unwrappedAt: new Date().toISOString() };
          return unwrapped;
        }
        return mb;
      }));

      return unwrapped;
    } catch (error) {
      console.error('Error unwrapping mystery book:', error);
      toast.error('Failed to unwrap mystery book');
      return null;
    }
  }, [user]);

  const acceptMysteryBook = useCallback(async (mysteryBook: MysteryBook) => {
    if (!user) return;

    try {
      // Add book to shelf
      const { error: bookError } = await supabase.from('books').insert({
        user_id: user.id,
        title: mysteryBook.title,
        author: mysteryBook.author,
        cover_url: mysteryBook.coverUrl,
        status: 'want-to-read',
        color: `hsl(${Math.floor(Math.random() * 360)}, 45%, 35%)`,
        description: mysteryBook.description,
        categories: mysteryBook.categories,
        page_count: mysteryBook.pageCount,
        isbn: mysteryBook.isbn,
      });

      if (bookError) throw bookError;

      const { error: updateError } = await (supabase
        .from('mystery_books') as any)
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', mysteryBook.id);

      if (updateError) throw updateError;

      setPendingMysteryBooks(prev => prev.filter(mb => mb.id !== mysteryBook.id));
      toast.success(`Added "${mysteryBook.title}" to your shelf!`);
    } catch (error) {
      console.error('Error accepting mystery book:', error);
      toast.error('Failed to accept mystery book');
    }
  }, [user]);

  const declineMysteryBook = useCallback(async (mysteryBookId: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase
        .from('mystery_books') as any)
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', mysteryBookId);

      if (error) throw error;

      setPendingMysteryBooks(prev => prev.filter(mb => mb.id !== mysteryBookId));
      toast.success('Mystery book declined');
    } catch (error) {
      console.error('Error declining mystery book:', error);
      toast.error('Failed to decline mystery book');
    }
  }, [user]);

  const reactToMysteryBook = useCallback(async (mysteryBookId: string, emoji: string, note?: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase
        .from('mystery_books') as any)
        .update({
          reaction_emoji: emoji,
          reaction_note: note || null,
          reacted_at: new Date().toISOString(),
        })
        .eq('id', mysteryBookId);

      if (error) throw error;

      setPendingMysteryBooks(prev => prev.map(mb => {
        if (mb.id === mysteryBookId) {
          return { ...mb, reactionEmoji: emoji, reactionNote: note || null, reactedAt: new Date().toISOString() };
        }
        return mb;
      }));
    } catch (error) {
      console.error('Error reacting to mystery book:', error);
      toast.error('Failed to send reaction');
    }
  }, [user]);

  const markAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      await (supabase
        .from('notification_settings') as any)
        .update({ last_seen_mystery_books_at: new Date().toISOString() })
        .eq('user_id', user.id);

      setLastSeenAt(new Date());
      setReactionNotifications([]);
    } catch (error) {
      console.error('Error marking mystery books as seen:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchMysteryBooks();
  }, [fetchMysteryBooks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('mystery-books-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mystery_books',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          fetchMysteryBooks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mystery_books',
          filter: `from_user_id=eq.${user.id}`,
        },
        () => {
          // Refetch to pick up reactions on mystery books I sent
          fetchMysteryBooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMysteryBooks]);

  const pendingCount = lastSeenLoaded
    ? pendingMysteryBooks.filter(mb => new Date(mb.createdAt) > (lastSeenAt || new Date(0))).length
      + reactionNotifications.length
    : 0;

  return {
    pendingMysteryBooks,
    reactionNotifications,
    pendingCount,
    isLoading,
    lastSeenAt,
    unwrapMysteryBook,
    acceptMysteryBook,
    declineMysteryBook,
    reactToMysteryBook,
    markAsSeen,
    refetch: fetchMysteryBooks,
  };
}
