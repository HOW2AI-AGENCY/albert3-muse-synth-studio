/**
 * Audio Player Context - Модульная архитектура
 * 
 * Экспорт всех компонентов и хуков для аудиоплеера
 */

export { AudioPlayerProvider, useAudioPlayer, useAudioPlayerSafe } from './AudioPlayerProvider';
export { PLAYER_HEIGHTS } from './types';
export type { AudioPlayerContextType } from './types';
export { hasKnownAudioExtension } from './useAudioPlayback';
