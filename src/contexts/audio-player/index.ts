/**
 * Audio Player Context - DEPRECATED
 * 
 * Этот модуль больше не используется.
 * Используйте Zustand store: @/stores/audioPlayerStore
 * 
 * @deprecated Мигрировано на Zustand. Используйте useAudioPlayerStore
 */

export { PLAYER_HEIGHTS } from './types';
export type { AudioPlayerContextType } from './types';

// Legacy re-exports для обратной совместимости (будут удалены в v3.1.0)
export { useAudioPlayer, useAudioPlayerSafe } from '@/hooks/useAudioPlayer';

export const hasKnownAudioExtension = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.webm'];
  return AUDIO_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext));
};
