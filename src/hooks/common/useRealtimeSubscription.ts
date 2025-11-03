/**
 * Generic realtime subscription hook
 * Handles Supabase Realtime subscriptions with automatic cleanup
 * 
 * @example
 * ```tsx
 * useRealtimeSubscription<Track>(
 *   'tracks-channel',
 *   'tracks',
 *   `user_id=eq.${userId}`,
 *   (payload) => console.log('Track updated:', payload)
 * );
 * ```
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscriptionOptions {
  /** Supabase schema (default: 'public') */
  schema?: string;
  /** Event type (default: '*' for all events) */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

/**
 * Subscribe to realtime changes on a Supabase table
 */
export function useRealtimeSubscription<T = unknown>(
  channelName: string,
  tableName: string,
  filter: string,
  onUpdate: (payload: T) => void,
  options: RealtimeSubscriptionOptions = {}
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep callback reference fresh
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: tableName,
          filter,
        },
        (payload: any) => {
          onUpdateRef.current(payload.new as T);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, tableName, filter, options.schema, options.event]);
}
