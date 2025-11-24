/**
 * @file useTrackState.ts
 * @description Hook for managing track state
 */
import { useState, useCallback } from 'react';

export interface TrackState {
  isPlaying: boolean;
  isLiked: boolean;
  isFavorite: boolean;
}

export const useTrackState = (_trackId: string, initialState?: Partial<TrackState>) => {
  const [state, setState] = useState<TrackState>({
    isPlaying: initialState?.isPlaying ?? false,
    isLiked: initialState?.isLiked ?? false,
    isFavorite: initialState?.isFavorite ?? false,
  });

  const setIsPlaying = useCallback((isPlaying: boolean) => {
    setState(prev => ({ ...prev, isPlaying }));
  }, []);

  const setIsLiked = useCallback((isLiked: boolean) => {
    setState(prev => ({ ...prev, isLiked }));
  }, []);

  const setIsFavorite = useCallback((isFavorite: boolean) => {
    setState(prev => ({ ...prev, isFavorite }));
  }, []);

  const toggleLike = useCallback(() => {
    setState(prev => ({ ...prev, isLiked: !prev.isLiked }));
  }, []);

  const toggleFavorite = useCallback(() => {
    setState(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
  }, []);

  return {
    ...state,
    setIsPlaying,
    setIsLiked,
    setIsFavorite,
    toggleLike,
    toggleFavorite,
  };
};
