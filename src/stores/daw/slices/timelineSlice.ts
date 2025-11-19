/**
 * Timeline Slice - DAW Store
 *
 * Manages timeline and playback state:
 * - Playback control (play, pause, stop, seek)
 * - Timeline view (zoom, scroll)
 * - Loop configuration
 * - Grid snapping
 * - Recording state
 *
 * @module stores/daw/slices/timelineSlice
 * @since v4.1.0
 */

import { StateCreator } from 'zustand';
import { logInfo } from '@/utils/logger';
import { TimelineState, ToolMode } from '../types';

// ==========================================
// SLICE STATE
// ==========================================

export interface TimelineSlice {
  // State
  timeline: TimelineState;
  isPlaying: boolean;
  isRecording: boolean;
  toolMode: ToolMode;

  // Playback Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  togglePlayPause: () => void;

  // Loop Actions
  setLoop: (start: number | null, end: number | null) => void;
  toggleLoop: () => void;
  clearLoop: () => void;

  // View Actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScroll: (scrollLeft: number) => void;

  // Grid Actions
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  snapTimeToGrid: (time: number, bpm: number) => number;

  // Recording
  startRecording: () => void;
  stopRecording: () => void;

  // Tool Mode
  setToolMode: (mode: ToolMode) => void;

  // Duration
  updateDuration: (duration: number) => void;
}

// ==========================================
// CONSTANTS
// ==========================================

const ZOOM_MIN = 10; // 10 pixels per second
const ZOOM_MAX = 500; // 500 pixels per second
const ZOOM_STEP = 1.2; // 20% zoom steps

const DEFAULT_TIMELINE: TimelineState = {
  currentTime: 0,
  duration: 0,
  zoom: 60, // 60 pixels per second
  scrollLeft: 0,
  loopStart: null,
  loopEnd: null,
  isLooping: false,
  snapToGrid: true,
  gridSize: 1, // 1 beat
};

// ==========================================
// SLICE CREATOR
// ==========================================

export const createTimelineSlice: StateCreator<TimelineSlice> = (set, get) => ({
  // ==========================================
  // INITIAL STATE
  // ==========================================
  timeline: DEFAULT_TIMELINE,
  isPlaying: false,
  isRecording: false,
  toolMode: 'select',

  // ==========================================
  // PLAYBACK ACTIONS
  // ==========================================

  play: () => {
    logInfo('DAW playback started', 'TimelineSlice');
    set({ isPlaying: true });
  },

  pause: () => {
    logInfo('DAW playback paused', 'TimelineSlice');
    set({ isPlaying: false });
  },

  stop: () => {
    logInfo('DAW playback stopped', 'TimelineSlice');
    set((state) => ({
      isPlaying: false,
      timeline: { ...state.timeline, currentTime: 0 },
    }));
  },

  seekTo: (time: number) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        currentTime: Math.max(0, Math.min(time, state.timeline.duration)),
      },
    }));
  },

  togglePlayPause: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  // ==========================================
  // LOOP ACTIONS
  // ==========================================

  setLoop: (start: number | null, end: number | null) => {
    set((state) => {
      const isLooping = start !== null && end !== null;

      logInfo(
        isLooping
          ? `Setting loop: ${start}s - ${end}s`
          : 'Clearing loop',
        'TimelineSlice'
      );

      return {
        timeline: {
          ...state.timeline,
          loopStart: start,
          loopEnd: end,
          isLooping,
        },
      };
    });
  },

  toggleLoop: () => {
    set((state) => {
      const newIsLooping = !state.timeline.isLooping;

      logInfo(
        newIsLooping ? 'Loop enabled' : 'Loop disabled',
        'TimelineSlice'
      );

      return {
        timeline: {
          ...state.timeline,
          isLooping: newIsLooping,
        },
      };
    });
  },

  clearLoop: () => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        loopStart: null,
        loopEnd: null,
        isLooping: false,
      },
    }));
  },

  // ==========================================
  // VIEW ACTIONS
  // ==========================================

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));

    set((state) => ({
      timeline: { ...state.timeline, zoom: clampedZoom },
    }));
  },

  zoomIn: () => {
    const { timeline } = get();
    get().setZoom(timeline.zoom * ZOOM_STEP);
  },

  zoomOut: () => {
    const { timeline } = get();
    get().setZoom(timeline.zoom / ZOOM_STEP);
  },

  setScroll: (scrollLeft: number) => {
    set((state) => ({
      timeline: { ...state.timeline, scrollLeft: Math.max(0, scrollLeft) },
    }));
  },

  // ==========================================
  // GRID ACTIONS
  // ==========================================

  toggleSnapToGrid: () => {
    set((state) => {
      const newSnapToGrid = !state.timeline.snapToGrid;

      logInfo(
        newSnapToGrid ? 'Snap to grid enabled' : 'Snap to grid disabled',
        'TimelineSlice'
      );

      return {
        timeline: { ...state.timeline, snapToGrid: newSnapToGrid },
      };
    });
  },

  setGridSize: (size: number) => {
    set((state) => ({
      timeline: { ...state.timeline, gridSize: Math.max(0.25, size) },
    }));
  },

  snapTimeToGrid: (time: number, bpm: number): number => {
    const { timeline } = get();

    if (!timeline.snapToGrid) {
      return time;
    }

    const beatDuration = 60 / bpm; // Duration of one beat in seconds
    const gridDuration = beatDuration * timeline.gridSize;
    const snappedTime = Math.round(time / gridDuration) * gridDuration;

    return snappedTime;
  },

  // ==========================================
  // RECORDING ACTIONS
  // ==========================================

  startRecording: () => {
    logInfo('Recording started', 'TimelineSlice');
    set({ isRecording: true, isPlaying: true });
  },

  stopRecording: () => {
    logInfo('Recording stopped', 'TimelineSlice');
    set({ isRecording: false });
  },

  // ==========================================
  // TOOL MODE
  // ==========================================

  setToolMode: (mode: ToolMode) => {
    logInfo(`Tool mode changed: ${mode}`, 'TimelineSlice');
    set({ toolMode: mode });
  },

  // ==========================================
  // DURATION
  // ==========================================

  updateDuration: (duration: number) => {
    set((state) => ({
      timeline: { ...state.timeline, duration },
    }));
  },
});
