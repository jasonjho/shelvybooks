import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BookComment {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  createdAt: string;
  userEmail?: string;
}

export function useBookInteractions(bookId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState<string[]>([]); // array of user_ids who liked
  const [comments, setComments] = useState<BookComment[]>([]);
  const [loading, setLoading] = useState(true);

  const hasLiked = user ? likes.includes(user.id) : false;
  const likeCount = likes.length;

  // Fetch likes and comments for this book
  useEffect(() => {
    const fetchInteractions = async () => {
      setLoading(true);
      
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from('book_likes').select('user_id').eq('book_id', bookId),
        supabase.from('book_comments').select('*').eq('book_id', bookId).order('created_at', { ascending: true }),
      ]);

      if (likesRes.data) {
        setLikes(likesRes.data.map((l) => l.user_id));
      }

      if (commentsRes.data) {
        setComments(
          commentsRes.data.map((c) => ({
            id: c.id,
            bookId: c.book_id,
            userId: c.user_id,
            content: c.content,
            createdAt: c.created_at,
          }))
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
      setLikes((prev) => prev.filter((id) => id !== user.id));
    } else {
      // Like
      const { error } = await supabase
        .from('book_likes')
        .insert({ book_id: bookId, user_id: user.id });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      setLikes((prev) => [...prev, user.id]);
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

      setComments((prev) => [
        ...prev,
        {
          id: data.id,
          bookId: data.book_id,
          userId: data.user_id,
          content: data.content,
          createdAt: data.created_at,
        },
      ]);
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
