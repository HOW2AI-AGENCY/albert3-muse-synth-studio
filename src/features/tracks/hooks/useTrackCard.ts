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
}

/**
 * Custom hook for TrackCard business logic
 */
export const useTrackCard = (track: Track, callbacks: TrackCardCallbacks) => {
  const state = useTrackCardState(track);

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
