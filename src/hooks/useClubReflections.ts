import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ClubReflection {
  id: string;
  clubId: string;
  suggestionId: string;
  userId: string;
  rating: number;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  // Profile info (null if anonymous)
  displayName: string | null;
  shareId: string | null;
}

export function useClubReflections(clubId: string | undefined, suggestionId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<ClubReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReflection, setUserReflection] = useState<ClubReflection | null>(null);

  const fetchReflections = useCallback(async () => {
    if (!clubId || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from('book_club_reflections')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (suggestionId) {
      query = query.eq('suggestion_id', suggestionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reflections:', error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setReflections([]);
      setUserReflection(null);
      setLoading(false);
      return;
    }

    // Get user IDs for non-anonymous reflections
    const userIds = data
      .filter(r => !r.is_anonymous)
      .map(r => r.user_id);

    // Fetch profiles and shelf settings for non-anonymous users
    const profileMap = new Map<string, { displayName: string | null; shareId: string | null }>();

    if (userIds.length > 0) {
      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      // Get public shelf info
      const { data: shelfData } = await supabase
        .rpc('get_public_shelf_info_for_users', { _user_ids: userIds });

      const shelfMap = new Map<string, { displayName: string | null; shareId: string | null }>();
      if (shelfData && Array.isArray(shelfData)) {
        (shelfData as Array<{ user_id: string; display_name: string | null; share_id: string | null }>).forEach(s => {
          shelfMap.set(s.user_id, { displayName: s.display_name, shareId: s.share_id });
        });
      }

      profiles?.forEach(p => {
        const shelf = shelfMap.get(p.user_id);
        profileMap.set(p.user_id, {
          displayName: shelf?.displayName || p.username,
          shareId: shelf?.shareId || null,
        });
      });
    }

    const mappedReflections: ClubReflection[] = data.map(r => {
      const profile = r.is_anonymous ? null : profileMap.get(r.user_id);
      return {
        id: r.id,
        clubId: r.club_id,
        suggestionId: r.suggestion_id,
        userId: r.user_id,
        rating: r.rating,
        content: r.content,
        isAnonymous: r.is_anonymous,
        createdAt: r.created_at,
        displayName: profile?.displayName || null,
        shareId: profile?.shareId || null,
      };
    });

    setReflections(mappedReflections);
    
    // Find user's own reflection
    const ownReflection = mappedReflections.find(r => r.userId === user.id);
    setUserReflection(ownReflection || null);
    
    setLoading(false);
  }, [clubId, suggestionId, user]);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  const addReflection = useCallback(
    async (
      targetSuggestionId: string,
      rating: number,
      content: string,
      isAnonymous: boolean
    ): Promise<boolean> => {
      if (!user || !clubId) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to add a reflection.',
          variant: 'destructive',
        });
        return false;
      }

      const { data, error } = await supabase
        .from('book_club_reflections')
        .insert({
          club_id: clubId,
          suggestion_id: targetSuggestionId,
          user_id: user.id,
          rating,
          content: content.trim(),
          is_anonymous: isAnonymous,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding reflection:', error);
        toast({
          title: 'Error adding reflection',
          description: error.message.includes('duplicate') 
            ? 'You\'ve already shared your thoughts on this book.'
            : error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Reflection added!',
        description: 'Your thoughts have been shared with the club.',
      });

      await fetchReflections();
      return true;
    },
    [user, clubId, toast, fetchReflections]
  );

  const updateReflection = useCallback(
    async (
      reflectionId: string,
      rating: number,
      content: string,
      isAnonymous: boolean
    ): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from('book_club_reflections')
        .update({
          rating,
          content: content.trim(),
          is_anonymous: isAnonymous,
        })
        .eq('id', reflectionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating reflection:', error);
        toast({
          title: 'Error updating reflection',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Reflection updated',
      });

      await fetchReflections();
      return true;
    },
    [user, toast, fetchReflections]
  );

  const deleteReflection = useCallback(
    async (reflectionId: string): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from('book_club_reflections')
        .delete()
        .eq('id', reflectionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting reflection:', error);
        toast({
          title: 'Error deleting reflection',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Reflection deleted',
      });

      await fetchReflections();
      return true;
    },
    [user, toast, fetchReflections]
  );

  // Get reflections for a specific suggestion
  const getReflectionsForSuggestion = useCallback(
    (targetSuggestionId: string) => {
      return reflections.filter(r => r.suggestionId === targetSuggestionId);
    },
    [reflections]
  );

  // Check if user has reflected on a suggestion
  const hasReflectedOn = useCallback(
    (targetSuggestionId: string) => {
      return reflections.some(r => r.suggestionId === targetSuggestionId && r.userId === user?.id);
    },
    [reflections, user]
  );

  // Get average rating for a suggestion
  const getAverageRating = useCallback(
    (targetSuggestionId: string) => {
      const suggestionReflections = reflections.filter(r => r.suggestionId === targetSuggestionId);
      if (suggestionReflections.length === 0) return null;
      const sum = suggestionReflections.reduce((acc, r) => acc + r.rating, 0);
      return sum / suggestionReflections.length;
    },
    [reflections]
  );

  return {
    reflections,
    loading,
    userReflection,
    addReflection,
    updateReflection,
    deleteReflection,
    getReflectionsForSuggestion,
    hasReflectedOn,
    getAverageRating,
    refetch: fetchReflections,
  };
}
