import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export function useFollows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get users I'm following
  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id);
      
      if (error) throw error;
      return data as Follow[];
    },
    enabled: !!user,
  });

  // Get my followers
  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['followers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('following_id', user.id);
      
      if (error) throw error;
      return data as Follow[];
    },
    enabled: !!user,
  });

  // Check if I follow a specific user
  const isFollowing = (userId: string) => {
    return following.some(f => f.following_id === userId);
  };

  // Follow a user
  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      toast.success('Now following this shelf');
    },
    onError: (error: Error) => {
      console.error('Follow error:', error);
      toast.error('Failed to follow');
    },
  });

  // Unfollow a user
  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      toast.success('Unfollowed');
    },
    onError: (error: Error) => {
      console.error('Unfollow error:', error);
      toast.error('Failed to unfollow');
    },
  });

  return {
    following,
    followers,
    loadingFollowing,
    loadingFollowers,
    isFollowing,
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    isFollowPending: followMutation.isPending,
    isUnfollowPending: unfollowMutation.isPending,
  };
}

// Hook to get new books from followed users for notifications
export function useFollowedUsersBooks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['followed-users-books', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get users I follow
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;
      if (!follows || follows.length === 0) return [];

      const followingIds = follows.map(f => f.following_id);

      // Get books from followed users (last 30 days, max 20 books)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: books, error: booksError } = await supabase
        .from('books')
        .select(`
          id,
          title,
          author,
          cover_url,
          created_at,
          user_id
        `)
        .in('user_id', followingIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (booksError) throw booksError;
      if (!books || books.length === 0) return [];

      // Get profiles for these users
      const userIds = [...new Set(books.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return books.map(book => ({
        ...book,
        username: profileMap.get(book.user_id)?.username || 'Unknown',
        avatarUrl: profileMap.get(book.user_id)?.avatar_url || null,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
