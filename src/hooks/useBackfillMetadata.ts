import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackfillResult {
  message: string;
  total: number;
  updated: number;
  errors?: string[];
}

export function useBackfillMetadata() {
  const { toast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);

  const backfillMetadata = useCallback(async (): Promise<BackfillResult | null> => {
    setIsBackfilling(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('backfill-metadata');
      
      if (error) {
        throw new Error(error.message || 'Failed to backfill metadata');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: 'Metadata updated',
        description: `Updated ${data.updated} of ${data.total} books with missing metadata.`,
      });
      
      return data as BackfillResult;
    } catch (err) {
      toast({
        title: 'Backfill failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsBackfilling(false);
    }
  }, [toast]);

  return {
    backfillMetadata,
    isBackfilling,
  };
}
