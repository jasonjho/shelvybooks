import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback, useState, useEffect } from 'react';

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
      
      const { data, error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId })
        .select()
        .single();
      
      if (error) throw error;
      return data as Follow;
    },
    onMutate: async (targetUserId: string) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['following', user?.id] });
      
      // Snapshot previous value
      const previousFollowing = queryClient.getQueryData<Follow[]>(['following', user?.id]);
      
      // Optimistically update
      queryClient.setQueryData<Follow[]>(['following', user?.id], (old = []) => [
        ...old,
        { id: 'optimistic', follower_id: user!.id, following_id: targetUserId, created_at: new Date().toISOString() }
      ]);
      
      return { previousFollowing };
    },
    onSuccess: (data) => {
      // Replace optimistic entry with real data (no refetch needed)
      queryClient.setQueryData<Follow[]>(['following', user?.id], (old = []) =>
        old.map(f => f.id === 'optimistic' && f.following_id === data.following_id ? data : f)
      );
      toast.success('Now following this shelf');
    },
    onError: (error: Error, _targetUserId, context) => {
      // Rollback on error
      if (context?.previousFollowing) {
        queryClient.setQueryData(['following', user?.id], context.previousFollowing);
      }
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
      return targetUserId;
    },
    onMutate: async (targetUserId: string) => {
      await queryClient.cancelQueries({ queryKey: ['following', user?.id] });
      
      const previousFollowing = queryClient.getQueryData<Follow[]>(['following', user?.id]);
      
      // Optimistically remove
      queryClient.setQueryData<Follow[]>(['following', user?.id], (old = []) =>
        old.filter(f => f.following_id !== targetUserId)
      );
      
      return { previousFollowing };
    },
    onSuccess: () => {
      toast.success('Unfollowed');
      // No invalidation needed - optimistic update already removed it
    },
    onError: (error: Error, _targetUserId, context) => {
      if (context?.previousFollowing) {
        queryClient.setQueryData(['following', user?.id], context.previousFollowing);
      }
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

interface FollowedBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  created_at: string;
  user_id: string;
  username: string;
  avatarUrl: string | null;
}

// Hook to get new books from followed users for notifications
export function useFollowedUsersBooks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Initialize to current time to prevent flash of "new" notifications before we load the actual lastSeenAt
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);

  // Fetch last seen timestamp
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('notification_settings')
      .select('last_seen_follows_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.last_seen_follows_at) {
          setLastSeenAt(new Date(data.last_seen_follows_at));
        }
        setLastSeenLoaded(true);
      });
  }, [user]);

  const { data: allBooks = [], isLoading } = useQuery({
    queryKey: ['followed-users-books', user?.id],
    queryFn: async (): Promise<FollowedBook[]> => {
      if (!user) return [];

      // Get users I follow WITH the timestamp of when I started following
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;
      if (!follows || follows.length === 0) return [];

      // Map of user_id -> when I started following them
      const followedAtMap = new Map(follows.map(f => [f.following_id, new Date(f.created_at)]));
      const followingIds = follows.map(f => f.following_id);

      // Get books from followed users (last 30 days, max 50 to allow for filtering)
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
        .limit(50);

      if (booksError) throw booksError;
      if (!books || books.length === 0) return [];

      // Only include books added AFTER we started following that user
      const filteredBooks = books.filter(book => {
        const followedAt = followedAtMap.get(book.user_id);
        if (!followedAt) return false;
        return new Date(book.created_at) > followedAt;
      }).slice(0, 20); // Limit to 20 after filtering

      if (filteredBooks.length === 0) return [];

      // Get profiles for these users
      const userIds = [...new Set(filteredBooks.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return filteredBooks.map(book => ({
        ...book,
        username: profileMap.get(book.user_id)?.username || 'Unknown',
        avatarUrl: profileMap.get(book.user_id)?.avatar_url || null,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter to only show books added after last seen
  // Don't show any as "new" until we've loaded the lastSeenAt to prevent flash
  const newBooks = !lastSeenLoaded ? [] : allBooks.filter(book => {
    if (!lastSeenAt) return true; // If never seen (new user), show all
    return new Date(book.created_at) > lastSeenAt;
  });

  // Mark followed books as seen
  const markFollowsAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      // Upsert notification settings with current timestamp
      await supabase
        .from('notification_settings')
        .upsert({ 
          user_id: user.id, 
          last_seen_follows_at: new Date().toISOString() 
        }, { 
          onConflict: 'user_id' 
        });

      setLastSeenAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['followed-users-books', user.id] });
    } catch (error) {
      console.error('Error marking follows as seen:', error);
    }
  }, [user, queryClient]);

  return {
    data: newBooks,
    allBooks,
    isLoading,
    newCount: newBooks.length,
    markAsSeen: markFollowsAsSeen,
  };
}
