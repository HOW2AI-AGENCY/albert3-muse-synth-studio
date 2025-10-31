/**
 * DEPRECATED: Audio Player Hook
 * 
 * Этот хук больше не используется.
 * Используйте селекторы из Zustand store: @/stores/audioPlayerStore
 * 
 * @deprecated Мигрировано на Zustand v3.0.0
 */

import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

/**
 * @deprecated Use useAudioPlayerStore from @/stores/audioPlayerStore
 * 
 * Примеры миграции:
 * 
 * // Было:
 * const { currentTrack, isPlaying } = useAudioPlayer();
 * 
 * // Стало:
 * import { useCurrentTrack, useIsPlaying } from '@/stores/audioPlayerStore';
 * const currentTrack = useCurrentTrack();
 * const isPlaying = useIsPlaying();
 * 
 * // Или для действий:
 * import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
 * const playTrack = useAudioPlayerStore((state) => state.playTrack);
 */
export const useAudioPlayer = () => {
  console.warn('⚠️ useAudioPlayer is deprecated. Use selectors from @/stores/audioPlayerStore');
  return useAudioPlayerStore.getState();
};

/**
 * @deprecated Use useAudioPlayerStore from @/stores/audioPlayerStore
 */
export const useAudioPlayerSafe = () => {
  console.warn('⚠️ useAudioPlayerSafe is deprecated. Use selectors from @/stores/audioPlayerStore');
  return useAudioPlayerStore.getState();
};
