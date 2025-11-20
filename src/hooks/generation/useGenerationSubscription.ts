import { useRef, useCallback, useEffect } from 'react';
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type TrackRow = Database['public']['Tables']['tracks']['Row'];

export const useGenerationSubscription = () => {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback((trackId: string, onUpdate: (payload: RealtimePostgresChangesPayload<TrackRow>) => void) => {
    const unsubscribe = RealtimeSubscriptionManager.subscribeToTrack<TrackRow>(
      trackId,
      onUpdate
    );

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, []);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { subscribe, cleanup };
};
