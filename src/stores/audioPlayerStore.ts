/**
 * Audio Player Store (Zustand) - Refactored with Slices
 *
 * This store is now organized into logical slices for better maintainability and separation of concerns.
 * - `playbackSlice`: Manages the state of the currently playing track.
 * - `queueSlice`: Manages the playback queue and related logic (next, previous, shuffle, repeat).
 * - `versionSlice`: Manages track versions.
 *
 * Data fetching for track versions has been extracted to the `useTrackVersions` hook.
 */

import { create } from 'zustand';
import { persist, type PersistOptions } from 'zustand/middleware';
import { logger } from '@/utils/logger';
import type { AudioPlayerTrack, TrackVersion, RepeatMode } from '@/types/track.types';
import type { StateCreator } from 'zustand';

// ==========================================
// SLICE DEFINITIONS
// ==========================================

interface PlaybackState {
  currentTrack: AudioPlayerTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  bufferingProgress: number;
}

interface PlaybackActions {
  playTrack: (track: AudioPlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  clearCurrentTrack: () => void;
  setVolume: (volume: number) => void;
  updateCurrentTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  updateBufferingProgress: (progress: number) => void;
}

type PlaybackSlice = PlaybackState & PlaybackActions;

const createPlaybackSlice: StateCreator<AudioPlayerStore, [], [], PlaybackSlice> = (set, get) => ({
  // State
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  bufferingProgress: 0,
  // Actions
  playTrack: (track) => {
    if (!track.audio_url) {
      logger.error('Cannot play track without audio URL', new Error('Missing audio URL'), 'audioPlayerStore', {
        trackId: track.id,
        title: track.title,
        status: track.status,
      });
      return;
    }

    if (get().currentTrack?.id === track.id && get().isPlaying) {
      // If same track is already playing, maybe restart it? For now, do nothing.
      get().seekTo(0);
      return;
    }

    set({
      currentTrack: track,
      isPlaying: true,
      currentTime: 0,
      duration: track.duration || 0,
    });
  },
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  seekTo: (time) => set({ currentTime: time }),
  clearCurrentTrack: () => set({ currentTrack: null, isPlaying: false, currentTime: 0, duration: 0 }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  updateCurrentTime: (time) => set({ currentTime: time }),
  updateDuration: (duration) => set({ duration }),
  updateBufferingProgress: (progress) => set({ bufferingProgress: progress }),
});

// --- Queue Slice ---

interface QueueState {
  queue: AudioPlayerTrack[];
  currentQueueIndex: number;
  repeatMode: RepeatMode;
  isShuffleEnabled: boolean;
  shuffleHistory: string[];
}

interface QueueActions {
  playTrackWithQueue: (track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => void;
  addToQueue: (track: AudioPlayerTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
}

type QueueSlice = QueueState & QueueActions;

const createQueueSlice: StateCreator<AudioPlayerStore, [], [], QueueSlice> = (set, get) => ({
  // State
  queue: [],
  currentQueueIndex: -1,
  repeatMode: 'off',
  isShuffleEnabled: false,
  shuffleHistory: [],
  // Actions
  playTrackWithQueue: (track, allTracks) => {
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    get().playTrack(track);
    set({
      queue: allTracks,
      currentQueueIndex: trackIndex,
      shuffleHistory: [track.id],
    });
  },
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (trackId) => set((state) => ({ queue: state.queue.filter((t) => t.id !== trackId) })),
  clearQueue: () => set({ queue: [], currentQueueIndex: -1, shuffleHistory: [] }),
  playNext: () => {
    const { repeatMode, isShuffleEnabled, queue, shuffleHistory, currentTrack } = get();
    if (repeatMode === 'one' && currentTrack) {
      get().seekTo(0);
      get().playTrack(currentTrack);
      return;
    }

    if (isShuffleEnabled && queue.length > 0) {
      const unplayedTracks = queue.filter((track) => !shuffleHistory.includes(track.id));
      if (unplayedTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * unplayedTracks.length);
        const nextTrack = unplayedTracks[randomIndex];
        const queueIndex = queue.findIndex((t) => t.id === nextTrack.id);
        get().playTrack(nextTrack);
        set({ currentQueueIndex: queueIndex, shuffleHistory: [...shuffleHistory, nextTrack.id] });
        return;
      } else if (repeatMode === 'all') {
        set({ shuffleHistory: [] });
        get().playNext(); // Recursive call
        return;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    const nextIndex = get().currentQueueIndex + 1;
    if (nextIndex < queue.length) {
      const nextTrack = queue[nextIndex];
      get().playTrack(nextTrack);
      set({ currentQueueIndex: nextIndex });
    } else if (repeatMode === 'all' && queue.length > 0) {
      const firstTrack = queue[0];
      get().playTrack(firstTrack);
      set({ currentQueueIndex: 0 });
    }
  },
  playPrevious: () => {
    if (get().currentTime > 3) {
      get().seekTo(0);
      return;
    }
    const prevIndex = get().currentQueueIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = get().queue[prevIndex];
      get().playTrack(prevTrack);
      set({ currentQueueIndex: prevIndex });
    } else {
      get().seekTo(0);
    }
  },
  toggleRepeatMode: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    set((state) => ({ repeatMode: modes[(modes.indexOf(state.repeatMode) + 1) % modes.length] }));
  },
  toggleShuffle: () => {
    set((state) => ({
      isShuffleEnabled: !state.isShuffleEnabled,
      shuffleHistory: !state.isShuffleEnabled && state.currentTrack ? [state.currentTrack.id] : [],
    }));
  },
  setRepeatMode: (mode) => set({ repeatMode: mode }),
});

// --- Version Slice ---

interface VersionState {
  availableVersions: TrackVersion[];
  currentVersionId: string | null;
}

interface VersionActions {
  _setVersions: (versions: TrackVersion[], preferredVersionId?: string) => void;
  switchToVersion: (versionId: string) => void;
}

type VersionSlice = VersionState & VersionActions;

const createVersionSlice: StateCreator<AudioPlayerStore, [], [], VersionSlice> = (set, get) => ({
  // State
  availableVersions: [],
  currentVersionId: null,
  // Actions
  _setVersions: (versions, preferredVersionId) => {
    const currentTrack = get().currentTrack;
    if (!currentTrack) return;

    // Ensure the current track is among the loaded versions
    const parentId = currentTrack.parentTrackId ?? currentTrack.id;
    const isRelevant = versions.some(v => v.parentTrackId === parentId);

    if (isRelevant) {
      const versionToSelect = preferredVersionId ?? currentTrack.id;
      set({ availableVersions: versions, currentVersionId: versionToSelect });
    }
  },
  switchToVersion: (versionId) => {
    const { availableVersions, currentTrack, isPlaying, currentTime } = get();
    const version = availableVersions.find(v => v.id === versionId);

    if (!version || !currentTrack) return;

    const newTrack: AudioPlayerTrack = {
        ...currentTrack, // a lot of properties are shared
        id: version.id,
        audio_url: version.audio_url,
        cover_url: version.cover_url || currentTrack.cover_url,
        duration: version.duration || currentTrack.duration,
        versionNumber: version.versionNumber,
        isMasterVersion: version.isMasterVersion,
        parentTrackId: version.parentTrackId,
      };

    const safeCurrentTime = Math.min(currentTime, newTrack.duration || currentTime || 0);

    set({
      currentTrack: newTrack,
      currentVersionId: version.id,
      currentTime: safeCurrentTime,
      isPlaying, // Keep playback state
    });
  },
});

// ==========================================
// COMBINED STORE
// ==========================================

type AudioPlayerStore = PlaybackSlice & QueueSlice & VersionSlice;

const persistOptions: PersistOptions<AudioPlayerStore> = {
  name: 'audio-player-storage',
  // Only persist user preferences
  partialize: (state) => ({
    volume: state.volume,
    repeatMode: state.repeatMode,
    isShuffleEnabled: state.isShuffleEnabled,
  }),
};

export const useAudioPlayerStore = create<AudioPlayerStore>()(
  persist(
    (...a) => ({
      ...createPlaybackSlice(...a),
      ...createQueueSlice(...a),
      ...createVersionSlice(...a),
    }),
    persistOptions
  )
);

// ==========================================
// OPTIMIZED SELECTORS (can be further simplified or co-located)
// ==========================================

export const useCurrentTrack = () => useAudioPlayerStore((state) => state.currentTrack);
export const useIsPlaying = () => useAudioPlayerStore((state) => state.isPlaying);
export const usePlaybackProgress = () => useAudioPlayerStore((state) => ({
  currentTime: state.currentTime,
  duration: state.duration,
}));
export const usePlaybackControls = () => useAudioPlayerStore((state) => ({
  playTrack: state.playTrack,
  pause: state.pause,
  resume: state.resume,
  togglePlayPause: state.togglePlayPause,
  seekTo: state.seekTo,
}));
// ... other selectors can be created as needed
