import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NewFollower {
  id: string;
  followerId: string;
  username: string;
  avatarUrl: string | null;
  followedAt: string;
}

export function useFollowerNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);

  // Fetch last seen timestamp
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('notification_settings')
      .select('last_seen_followers_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.last_seen_followers_at) {
          setLastSeenAt(new Date(data.last_seen_followers_at));
        }
      });
  }, [user]);

  const { data: allFollowers = [], isLoading } = useQuery({
    queryKey: ['follower-notifications', user?.id],
    queryFn: async (): Promise<NewFollower[]> => {
      if (!user) return [];

      // Get my followers (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('id, follower_id, created_at')
        .eq('following_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (followsError) throw followsError;
      if (!follows || follows.length === 0) return [];

      // Get profiles for followers
      const followerIds = follows.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', followerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return follows.map(follow => ({
        id: follow.id,
        followerId: follow.follower_id,
        username: profileMap.get(follow.follower_id)?.username || 'Unknown',
        avatarUrl: profileMap.get(follow.follower_id)?.avatar_url || null,
        followedAt: follow.created_at,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter to only show followers after last seen
  const newFollowers = allFollowers.filter(follower => {
    if (!lastSeenAt) return true;
    return new Date(follower.followedAt) > lastSeenAt;
  });

  // Mark followers as seen
  const markAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notification_settings')
        .upsert({ 
          user_id: user.id, 
          last_seen_followers_at: new Date().toISOString() 
        }, { 
          onConflict: 'user_id' 
        });

      setLastSeenAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['follower-notifications', user.id] });
    } catch (error) {
      console.error('Error marking followers as seen:', error);
    }
  }, [user, queryClient]);

  // Subscribe to realtime follows
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('follower-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['follower-notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    newFollowers,
    allFollowers,
    newCount: newFollowers.length,
    isLoading,
    markAsSeen,
  };
}
