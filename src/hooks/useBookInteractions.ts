import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BookLike {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface BookComment {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  createdAt: string;
  username?: string;
  avatarUrl?: string | null;
}

export function useBookInteractions(bookId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState<BookLike[]>([]);
  const [comments, setComments] = useState<BookComment[]>([]);
  const [loading, setLoading] = useState(true);

  const hasLiked = user ? likes.some((l) => l.userId === user.id) : false;
  const likeCount = likes.length;

  // Fetch likes and comments for this book
  useEffect(() => {
    const fetchInteractions = async () => {
      setLoading(true);
      
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from('book_likes').select('user_id, created_at').eq('book_id', bookId),
        supabase.from('book_comments').select('*').eq('book_id', bookId).order('created_at', { ascending: true }),
      ]);

      // Collect all user IDs from likes and comments
      const userIds = new Set<string>();
      if (likesRes.data) {
        likesRes.data.forEach((l) => userIds.add(l.user_id));
      }
      if (commentsRes.data) {
        commentsRes.data.forEach((c) => userIds.add(c.user_id));
      }

      // Fetch profiles for all users
      let profilesMap = new Map<string, { username: string; avatar_url: string | null }>();
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', Array.from(userIds));

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap.set(p.user_id, { username: p.username, avatar_url: p.avatar_url });
          });
        }
      }

      if (likesRes.data) {
        setLikes(
          likesRes.data.map((l) => {
            const profile = profilesMap.get(l.user_id);
            return {
              userId: l.user_id,
              username: profile?.username || null,
              avatarUrl: profile?.avatar_url || null,
              createdAt: l.created_at,
            };
          })
        );
      }

      if (commentsRes.data) {
        setComments(
          commentsRes.data.map((c) => {
            const profile = profilesMap.get(c.user_id);
            return {
              id: c.id,
              bookId: c.book_id,
              userId: c.user_id,
              content: c.content,
              createdAt: c.created_at,
              username: profile?.username,
              avatarUrl: profile?.avatar_url,
            };
          })
        );
      }

      setLoading(false);
    };

    if (bookId) {
      fetchInteractions();
    }
  }, [bookId]);

  const toggleLike = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to like books.',
        variant: 'destructive',
      });
      return;
    }

    if (hasLiked) {
      // Unlike
      const { error } = await supabase
        .from('book_likes')
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', user.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      setLikes((prev) => prev.filter((l) => l.userId !== user.id));
      window.posthog?.capture('book_unliked', { book_id: bookId });
    } else {
      // Like
      const { data, error } = await supabase
        .from('book_likes')
        .insert({ book_id: bookId, user_id: user.id })
        .select('created_at')
        .single();

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      // Fetch the current user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      setLikes((prev) => [
        ...prev,
        {
          userId: user.id,
          username: profileData?.username || null,
          avatarUrl: profileData?.avatar_url || null,
          createdAt: data.created_at,
        },
      ]);
      window.posthog?.capture('book_liked', { book_id: bookId });
    }
  }, [user, bookId, hasLiked, toast]);

  const addComment = useCallback(
    async (content: string) => {
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to comment.',
          variant: 'destructive',
        });
        return;
      }

      const trimmed = content.trim();
      if (!trimmed) return;

      const { data, error } = await supabase
        .from('book_comments')
        .insert({ book_id: bookId, user_id: user.id, content: trimmed })
        .select()
        .single();

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      // Fetch the current user's profile for display
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      setComments((prev) => [
        ...prev,
        {
          id: data.id,
          bookId: data.book_id,
          userId: data.user_id,
          content: data.content,
          createdAt: data.created_at,
          username: profileData?.username,
          avatarUrl: profileData?.avatar_url,
        },
      ]);
      window.posthog?.capture('comment_added', { book_id: bookId });
    },
    [user, bookId, toast]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const { error } = await supabase.from('book_comments').delete().eq('id', commentId);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [toast]
  );

  return {
    likes,
    likeCount,
    hasLiked,
    toggleLike,
    comments,
    addComment,
    deleteComment,
    loading,
  };
}
