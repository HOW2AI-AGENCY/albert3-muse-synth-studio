import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

type LyricsSubscriptionPayload = {
  trackId: string;
  jobId: string;
};

interface UseMurekaLyricsSubscriptionOptions {
  trackId?: string | null;
  enabled?: boolean;
  onLyricsStage: (payload: LyricsSubscriptionPayload) => void;
}

/**
 * Handles Supabase realtime subscription for Mureka lyrics selection stage.
 * Ensures explicit lifecycle control with start/stop helpers and cleanup.
 */
export const useMurekaLyricsSubscription = ({
  trackId,
  enabled = true,
  onLyricsStage,
}: UseMurekaLyricsSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const stop = useCallback(() => {
    if (channelRef.current) {
      logger.debug?.('Unsubscribing from Mureka lyrics channel', 'useMurekaLyricsSubscription', {
        channel: channelRef.current.topic,
      });
      supabase.removeChannel?.(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabled || !trackId) {
      stop();
      return null;
    }

    // Restart subscription if already active
    stop();

    const channel = supabase
      .channel(`track_lyrics_${trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          const track: any = payload.new;
          const jobId = track?.metadata?.lyrics_job_id;
          const stage = track?.metadata?.stage;

          if (stage === 'lyrics_selection' && jobId) {
            logger.info?.('Received Mureka lyrics selection stage', 'useMurekaLyricsSubscription', {
              trackId: track.id,
              jobId,
            });
            onLyricsStage({
              trackId: track.id as string,
              jobId: jobId as string,
            });
          }
        }
      );

    channel.subscribe();
    channelRef.current = channel;
    return channel;
  }, [enabled, onLyricsStage, stop, trackId]);

  useEffect(() => {
    if (!trackId || !enabled) {
      stop();
      return;
    }

    start();

    return () => {
      stop();
    };
  }, [enabled, start, stop, trackId]);

  return {
    start,
    stop,
    isActive: channelRef.current !== null,
  };
};
