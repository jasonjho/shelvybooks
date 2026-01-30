import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Re-export useProfile from context for backwards compatibility
export { useProfile } from '@/contexts/ProfileContext';

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
