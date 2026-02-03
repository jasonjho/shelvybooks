import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BookRecommendation {
  id: string;
  fromUserId: string;
  toUserId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  message: string | null;
  isbn: string | null;
  description: string | null;
  categories: string[] | null;
  pageCount: number | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt: string | null;
  // Enriched data
  fromUsername?: string;
  fromAvatarUrl?: string | null;
}

interface UseBookRecommendationsResult {
  pendingRecommendations: BookRecommendation[];
  pendingCount: number;
  isLoading: boolean;
  lastSeenAt: Date | null;
  acceptRecommendation: (recommendation: BookRecommendation) => Promise<void>;
  declineRecommendation: (recommendationId: string) => Promise<void>;
  markAsSeen: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBookRecommendations(): UseBookRecommendationsResult {
  const { user } = useAuth();
  const [pendingRecommendations, setPendingRecommendations] = useState<BookRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get notification settings for last seen timestamp
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('last_seen_recommendations_at')
        .eq('user_id', user.id)
        .single();

      const lastSeen = settings?.last_seen_recommendations_at
        ? new Date(settings.last_seen_recommendations_at)
        : new Date(0);
      setLastSeenAt(lastSeen);
      setLastSeenLoaded(true);

      // Fetch pending recommendations for this user
      const { data: recommendations, error } = await supabase
        .from('book_recommendations')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!recommendations || recommendations.length === 0) {
        setPendingRecommendations([]);
        setIsLoading(false);
        return;
      }

      // Get sender profiles
      const senderIds = [...new Set(recommendations.map(r => r.from_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', senderIds);

      const profilesMap = new Map(
        profiles?.map(p => [p.user_id, { username: p.username, avatarUrl: p.avatar_url }]) || []
      );

      // Map to our interface
      const mapped: BookRecommendation[] = recommendations.map(r => {
        const profile = profilesMap.get(r.from_user_id);
        return {
          id: r.id,
          fromUserId: r.from_user_id,
          toUserId: r.to_user_id,
          title: r.title,
          author: r.author,
          coverUrl: r.cover_url,
          message: r.message,
          isbn: r.isbn,
          description: r.description,
          categories: r.categories,
          pageCount: r.page_count,
          status: r.status as 'pending' | 'accepted' | 'declined',
          createdAt: r.created_at,
          respondedAt: r.responded_at,
          fromUsername: profile?.username,
          fromAvatarUrl: profile?.avatarUrl,
        };
      });

      setPendingRecommendations(mapped);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const acceptRecommendation = useCallback(async (recommendation: BookRecommendation) => {
    if (!user) return;

    try {
      // Add book to user's shelf
      const { error: bookError } = await supabase.from('books').insert({
        user_id: user.id,
        title: recommendation.title,
        author: recommendation.author,
        cover_url: recommendation.coverUrl,
        status: 'want-to-read',
        color: `hsl(${Math.floor(Math.random() * 360)}, 45%, 35%)`,
        description: recommendation.message
          ? `💌 Recommended by ${recommendation.fromUsername || 'a friend'}: "${recommendation.message}"`
          : recommendation.description,
        categories: recommendation.categories,
        page_count: recommendation.pageCount,
        isbn: recommendation.isbn,
      });

      if (bookError) throw bookError;

      // Update recommendation status
      const { error: updateError } = await supabase
        .from('book_recommendations')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', recommendation.id);

      if (updateError) throw updateError;

      // Remove from local state
      setPendingRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
      
      toast.success(`Added "${recommendation.title}" to your shelf!`);
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      toast.error('Failed to accept recommendation');
    }
  }, [user]);

  const declineRecommendation = useCallback(async (recommendationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('book_recommendations')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', recommendationId);

      if (error) throw error;

      // Remove from local state
      setPendingRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      
      toast.success('Recommendation declined');
    } catch (error) {
      console.error('Error declining recommendation:', error);
      toast.error('Failed to decline recommendation');
    }
  }, [user]);

  const markAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notification_settings')
        .update({ last_seen_recommendations_at: new Date().toISOString() })
        .eq('user_id', user.id);

      setLastSeenAt(new Date());
    } catch (error) {
      console.error('Error marking recommendations as seen:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Subscribe to realtime recommendations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('recommendations-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'book_recommendations',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          fetchRecommendations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRecommendations]);

  // Calculate new count (recommendations after last seen)
  const pendingCount = lastSeenLoaded 
    ? pendingRecommendations.filter(r => new Date(r.createdAt) > (lastSeenAt || new Date(0))).length
    : 0;

  return {
    pendingRecommendations,
    pendingCount,
    isLoading,
    lastSeenAt,
    acceptRecommendation,
    declineRecommendation,
    markAsSeen,
    refetch: fetchRecommendations,
  };
}
