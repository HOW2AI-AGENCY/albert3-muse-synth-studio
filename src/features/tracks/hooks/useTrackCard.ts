/**
 * Business logic for TrackCard component
 * Separates state management from UI rendering
 * 
 * @version 1.0.0
 */
import { useCallback } from 'react';
import { useTrackCardState } from '../components/card/useTrackCardState';
import type { Track } from '@/types/domain/track.types';

export interface TrackCardCallbacks {
  onShare?: () => void;
  onClick?: () => void;
  onRetry?: (trackId: string) => void;
  onSync?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onUpscaleAudio?: (trackId: string) => void;
  onGenerateCover?: (trackId: string) => void;
}

/**
 * Custom hook for TrackCard business logic
 * Передает все необходимые callbacks в useTrackCardState
 */
export const useTrackCard = (track: Track, callbacks: TrackCardCallbacks) => {
  const state = useTrackCardState({
    track,
    onExtend: callbacks.onExtend,
    onCover: callbacks.onCover,
    onSeparateStems: callbacks.onSeparateStems,
    onAddVocal: callbacks.onAddVocal,
    onDescribeTrack: callbacks.onDescribeTrack,
    onCreatePersona: callbacks.onCreatePersona,
    onUpscaleAudio: callbacks.onUpscaleAudio,
    onGenerateCover: callbacks.onGenerateCover,
  });

  const handleShareClick = useCallback(() => {
    callbacks.onShare?.();
  }, [callbacks]);

  const handleCardClick = useCallback(() => {
    callbacks.onClick?.();
  }, [callbacks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callbacks.onClick?.();
    }
  }, [callbacks]);

  return {
    ...state,
    handleShareClick,
    handleCardClick,
    handleKeyDown,
  };
};
