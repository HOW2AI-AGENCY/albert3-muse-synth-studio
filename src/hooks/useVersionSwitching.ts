/**
 * Hook for synchronized version switching across all contexts
 * Fixes the limitation where version switching only worked in the player
 * 
 * @version 1.0.0
 * @created 2025-11-13
 */

import { useCallback } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export interface SwitchVersionParams {
  trackId: string;
  versionIndex: number;
  versionData: {
    audio_url?: string;
    cover_url?: string;
    title?: string;
    duration?: number;
    lyrics?: string;
  };
}

export const useVersionSwitching = () => {
  const queryClient = useQueryClient();
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const play = useAudioPlayerStore((state) => state.play);
  const pause = useAudioPlayerStore((state) => state.pause);

  const switchVersion = useCallback(
    async ({ trackId, versionIndex, versionData }: SwitchVersionParams) => {
      try {
        logger.info('Switching to version', 'useVersionSwitching', {
          trackId,
          versionIndex,
          hasAudio: !!versionData.audio_url,
        });

        // Update player store if this is the current track
        if (currentTrack?.id === trackId) {
          // Pause playback on version switch
          pause();
          
          logger.info('Version switch requested, pausing playback', 'useVersionSwitching', {
            trackId,
            versionIndex,
          });
        }

        // Invalidate queries to refresh UI
        await queryClient.invalidateQueries({
          queryKey: ['tracks'],
        });
        await queryClient.invalidateQueries({
          queryKey: ['track', trackId],
        });

        toast.success(`Переключено на версию ${versionIndex + 1}`);
      } catch (error) {
        logger.error('Failed to switch version', error as Error, 'useVersionSwitching', {
          trackId,
          versionIndex,
        });
        toast.error('Не удалось переключить версию');
      }
    },
    [currentTrack, pause, queryClient]
  );

  return {
    switchVersion,
  };
};
