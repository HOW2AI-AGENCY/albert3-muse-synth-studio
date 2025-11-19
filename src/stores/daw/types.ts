/**
 * DAW Store Types
 *
 * Shared types for DAW (Digital Audio Workstation) state management.
 * Used across all DAW slices for consistency.
 *
 * @module stores/daw/types
 * @since v4.1.0 (refactored from dawStore.ts)
 */

// ==========================================
// CORE TYPES
// ==========================================

export interface DAWClip {
  id: string;
  trackId: string;
  stemId?: string;
  name: string;
  audioUrl: string;
  startTime: number; // Position on timeline (seconds)
  duration: number; // Clip duration (seconds)
  offset: number; // Offset in source audio (seconds)
  volume: number;
  fadeIn: number;
  fadeOut: number;
  color?: string;
}

export interface DAWEffect {
  id: string;
  type: 'eq' | 'compressor' | 'reverb' | 'delay' | 'chorus' | 'distortion';
  enabled: boolean;
  params: Record<string, number>;
}

export interface DAWTrack {
  id: string;
  name: string;
  type: 'audio' | 'stem' | 'master';
  stemType?: string; // vocals, drums, bass, etc.
  clips: DAWClip[];
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  isArmed: boolean; // For recording
  effects: DAWEffect[];
  color?: string;
  height: number; // Track height in pixels
}

export interface DAWMarker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

export interface DAWRegion {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  color?: string;
}

export interface DAWProject {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number]; // [4, 4] = 4/4
  sampleRate: number;
  tracks: DAWTrack[];
  markers: DAWMarker[];
  regions: DAWRegion[];
  masterVolume: number;
  created_at: string;
  updated_at: string;
}

// ==========================================
// STATE TYPES
// ==========================================

export interface TimelineState {
  currentTime: number; // Playhead position (seconds)
  duration: number; // Total project duration
  zoom: number; // Pixels per second
  scrollLeft: number; // Horizontal scroll position
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  snapToGrid: boolean;
  gridSize: number; // In beats
}

export interface SelectionState {
  selectedClipIds: Set<string>;
  selectedTrackIds: Set<string>;
  selectedRegion: { start: number; end: number } | null;
}

export interface ClipboardState {
  clips: DAWClip[];
  cutMode: boolean;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type ToolMode = 'select' | 'cut' | 'draw' | 'erase';

// ==========================================
// HELPERS
// ==========================================

export const generateId = (): string =>
  `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const createDefaultProject = (name: string): DAWProject => ({
  id: generateId(),
  name,
  bpm: 120,
  timeSignature: [4, 4],
  sampleRate: 44100,
  tracks: [
    {
      id: 'master',
      name: 'Master',
      type: 'master',
      clips: [],
      volume: 1.0,
      pan: 0,
      isMuted: false,
      isSolo: false,
      isArmed: false,
      effects: [],
      height: 80,
    },
  ],
  markers: [],
  regions: [],
  masterVolume: 1.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const createDefaultTrack = (
  type: 'audio' | 'stem',
  name: string,
  stemType?: string
): DAWTrack => ({
  id: generateId(),
  name,
  type,
  stemType,
  clips: [],
  volume: 1.0,
  pan: 0,
  isMuted: false,
  isSolo: false,
  isArmed: false,
  effects: [],
  height: 80,
});
