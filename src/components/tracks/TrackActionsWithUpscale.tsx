/**
 * Track Actions Menu with Audio Upscale Integration
 * Wraps UnifiedTrackActionsMenu with upscale functionality
 * 
 * @version 1.0.0
 * @since 2025-11-17
 */

import React, { useCallback } from 'react';
import { UnifiedTrackActionsMenu } from './shared/TrackActionsMenu.unified';
import { useAudioUpscaleWithVersion } from '@/hooks/useAudioUpscaleWithVersion';
import type { UnifiedTrackActionsMenuProps } from './shared/TrackActionsMenu.types';
import type { Track } from '@/services/api.service';

interface TrackActionsWithUpscaleProps extends Omit<UnifiedTrackActionsMenuProps, 'onUpscaleAudio'> {
  track: Track;
}

export const TrackActionsWithUpscale: React.FC<TrackActionsWithUpscaleProps> = ({
  track,
  ...menuProps
}) => {
  const { upscaleTrack, isUpscaling } = useAudioUpscaleWithVersion();

  const handleUpscale = useCallback((trackId: string) => {
    if (!track.audio_url) {
      console.error('[UPSCALE] No audio URL');
      return;
    }

    upscaleTrack({
      trackId,
      inputFileUrl: track.audio_url
    });
  }, [track.audio_url, upscaleTrack]);

  return (
    <UnifiedTrackActionsMenu
      {...menuProps}
      trackId={track.id}
      trackStatus={track.status}
      trackMetadata={track.metadata}
      onUpscaleAudio={handleUpscale}
      enableAITools={!isUpscaling}
    />
  );
};
