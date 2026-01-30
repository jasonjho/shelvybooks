import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Fetch profile for current user
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        setNeedsSetup(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          username: data.username,
          avatarUrl: data.avatar_url,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
        setNeedsSetup(false);
      } else {
        // User exists but no profile - needs setup
        setProfile(null);
        setNeedsSetup(true);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const createProfile = useCallback(
    async (username: string, avatarFile?: File) => {
      if (!user) return { error: 'Not authenticated' };

      let avatarUrl: string | null = null;

      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          toast({
            title: 'Avatar upload failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          return { error: uploadError.message };
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      // Create profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: username.trim(),
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          return { error: 'This username is already taken' };
        }
        return { error: error.message };
      }

      setProfile({
        id: data.id,
        userId: data.user_id,
        username: data.username,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
      setNeedsSetup(false);

      return { error: null };
    },
    [user, toast]
  );

  const updateProfile = useCallback(
    async (username: string, avatarFile?: File) => {
      if (!user || !profile) return { error: 'Not authenticated' };

      let avatarUrl = profile.avatarUrl;

      // Upload new avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          toast({
            title: 'Avatar upload failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          return { error: uploadError.message };
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Add cache buster to force refresh
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Update profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { error: 'This username is already taken' };
        }
        return { error: error.message };
      }

      setProfile({
        id: data.id,
        userId: data.user_id,
        username: data.username,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });

      return { error: null };
    },
    [user, profile, toast]
  );

  return {
    profile,
    loading,
    needsSetup,
    createProfile,
    updateProfile,
  };
}

// Fetch a profile by user ID (for displaying others' profiles)
export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    username: data.username,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Fetch multiple profiles by user IDs
export async function fetchProfilesByUserIds(userIds: string[]): Promise<Map<string, Profile>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('user_id', userIds);

  if (error || !data) return new Map();

  const map = new Map<string, Profile>();
  data.forEach((p) => {
    map.set(p.user_id, {
      id: p.id,
      userId: p.user_id,
      username: p.username,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    });
  });

  return map;
}
