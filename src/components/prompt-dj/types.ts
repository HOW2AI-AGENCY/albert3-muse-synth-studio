/**
 * Prompt DJ типы и интерфейсы
 */

export interface PromptData {
  id: string;
  text: string;
  weight: number; // 0-1
  isFiltered: boolean;
}

export type PlaybackState = 'stopped' | 'loading' | 'playing';

export interface PromptDjSession {
  sessionId: string;
  isConnected: boolean;
  playbackState: PlaybackState;
}

export interface WeightedPrompt {
  text: string;
  weight: number;
}
