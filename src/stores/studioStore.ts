// src/stores/studioStore.ts
import { create } from 'zustand';

type StemType = 'drums' | 'bass' | 'vocals' | 'atmosphere';

// Represents a single stem track in the studio
interface Stem {
  id: string;
  name: string;
  type: StemType;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  audioUrl: string; // URL to the audio file for the stem
}

// Represents the state of the lyrics display
interface LyricsState {
  lines: { time: number; text: string }[];
  currentLineIndex: number;
}

// Defines the shape of the studio store's state
interface StudioState {
  stems: Stem[];
  isPlaying: boolean;
  currentTime: number;
  lyrics: LyricsState;
  setStems: (stems: Stem[]) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  updateStemVolume: (stemId: string, volume: number) => void;
  toggleMute: (stemId: string) => void;
  toggleSolo: (stemId: string) => void;
}

/**
 * Zustand store for managing the state of the Stem Studio.
 *
 * This store handles everything related to the studio's state, including:
 * - The list of stem tracks and their properties (volume, mute, solo).
 * - Playback state (isPlaying, currentTime).
 * - Synchronized lyrics and the current active line.
 *
 * It uses the 'immer' middleware to allow for direct, immutable updates to the state.
 */
export const useStudioStore = create<StudioState>((set) => ({
  stems: [],
  isPlaying: false,
  currentTime: 0,
  lyrics: {
    lines: [],
    currentLineIndex: -1,
  },
  setStems: (stems) =>
    set({ stems }),
  togglePlay: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) =>
    set({ currentTime: time }),
  updateStemVolume: (stemId, volume) =>
    set((state) => ({
      stems: state.stems.map((s) =>
        s.id === stemId ? { ...s, volume } : s
      ),
    })),
  toggleMute: (stemId) =>
    set((state) => ({
      stems: state.stems.map((s) =>
        s.id === stemId ? { ...s, isMuted: !s.isMuted } : s
      ),
    })),
  toggleSolo: (stemId) =>
    set((state) => {
      const soloStem = state.stems.find((s) => s.id === stemId);
      if (!soloStem) return state;
      
      const isTurningSoloOn = !soloStem.isSolo;
      return {
        stems: state.stems.map((s) => ({
          ...s,
          isSolo: s.id === stemId ? isTurningSoloOn : false,
        })),
      };
    }),
}));
