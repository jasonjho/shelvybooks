import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ShelfSettings {
  id: string;
  user_id: string;
  is_public: boolean;
  share_id: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useShelfSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShelfSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create shelf settings for the current user
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Try to get existing settings
      const { data, error } = await supabase
        .from('shelf_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as ShelfSettings);
      } else {
        // Create default settings if none exist (public by default)
        const { data: newSettings, error: insertError } = await supabase
          .from('shelf_settings')
          .insert({ user_id: user.id, is_public: true })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as ShelfSettings);
      }
    } catch (err) {
      console.error('Error fetching shelf settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Note: All shelves are now public by default - no toggle needed

  // Update display name
  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('shelf_settings')
        .update({ display_name: displayName || null })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, display_name: displayName || null } : null);
      toast.success('Display name updated');
    } catch (err) {
      console.error('Error updating display name:', err);
      toast.error('Failed to update display name');
    }
  }, [settings]);

  // Get the shareable URL
  const getShareUrl = useCallback(() => {
    if (!settings?.share_id) return null;
    return `${window.location.origin}/shelf/${settings.share_id}`;
  }, [settings]);

  return {
    settings,
    loading,
    updateDisplayName,
    getShareUrl,
    refetch: fetchSettings,
  };
}
