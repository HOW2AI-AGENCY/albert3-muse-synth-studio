/**
 * Simplified Music Generation Store
 * Refactored to use composition with dedicated hooks
 */

import { create } from 'zustand';
import { MusicProvider } from '@/services/providers';

interface MusicGenerationState {
  selectedProvider: MusicProvider;
  setProvider: (provider: MusicProvider) => void;
}

export const useMusicGenerationStore = create<MusicGenerationState>((set) => ({
  selectedProvider: 'suno',
  setProvider: (provider: MusicProvider) => {
    set({ selectedProvider: provider });
  },
}));
