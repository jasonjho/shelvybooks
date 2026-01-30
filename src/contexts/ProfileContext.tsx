import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  needsSetup: boolean;
  createProfile: (username: string, avatarFile?: File) => Promise<{ error: string | null }>;
  updateProfile: (username: string, avatarFile?: File) => Promise<{ error: string | null }>;
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProfile = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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
        setProfile(null);
        setNeedsSetup(true);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user, refreshKey]);

  const createProfile = useCallback(
    async (username: string, avatarFile?: File) => {
      if (!user) return { error: 'Not authenticated' };

      let avatarUrl: string | null = null;

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

        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

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

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        needsSetup,
        createProfile,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
