import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Automatically backfills metadata for the user's books on login.
 * Only runs once per session and only if there are books needing metadata.
 */
export function useAutoBackfill() {
  const { user } = useAuth();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!user || hasRunRef.current) return;

    const runBackfill = async () => {
      try {
        // First check if there are any books needing backfill
        const { count } = await supabase
          .from('books')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('metadata_attempted_at', null)
          .or('page_count.is.null,description.is.null,categories.is.null');

        if (!count || count === 0) {
          console.log('No books need metadata backfill');
          return;
        }

        console.log(`Found ${count} books needing metadata, starting backfill...`);
        
        // Run backfill in background - don't await to avoid blocking UI
        supabase.functions.invoke('backfill-metadata').then(({ data, error }) => {
          if (error) {
            console.error('Backfill error:', error);
          } else {
            console.log('Backfill result:', data);
          }
        });
      } catch (err) {
        console.error('Error checking for backfill:', err);
      }
    };

    hasRunRef.current = true;
    // Small delay to let the app fully initialize
    const timeout = setTimeout(runBackfill, 2000);

    return () => clearTimeout(timeout);
  }, [user]);
}
