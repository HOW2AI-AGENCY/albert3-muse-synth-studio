// src/stores/studioStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

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
export const useStudioStore = create<StudioState>()(
  immer((set) => ({
    stems: [],
    isPlaying: false,
    currentTime: 0,
    lyrics: {
      lines: [],
      currentLineIndex: -1,
    },
    setStems: (stems) =>
      set((state) => {
        state.stems = stems;
      }),
    togglePlay: () =>
      set((state) => {
        state.isPlaying = !state.isPlaying;
      }),
    setCurrentTime: (time) =>
      set((state) => {
        state.currentTime = time;
      }),
    updateStemVolume: (stemId, volume) =>
      set((state: any) => {
        const stem = state.stems.find((s: any) => s.id === stemId);
        if (stem) {
          stem.volume = volume;
        }
      }),
    toggleMute: (stemId) =>
      set((state: any) => {
        const stem = state.stems.find((s: any) => s.id === stemId);
        if (stem) {
          stem.isMuted = !stem.isMuted;
        }
      }),
    toggleSolo: (stemId) =>
      set((state: any) => {
        const soloStem = state.stems.find((s: any) => s.id === stemId);
        if (soloStem) {
          const isTurningSoloOn = !soloStem.isSolo;
          state.stems.forEach((s: any) => {
            s.isSolo = false;
          });
          soloStem.isSolo = isTurningSoloOn;
        }
      }),
  }))
);
