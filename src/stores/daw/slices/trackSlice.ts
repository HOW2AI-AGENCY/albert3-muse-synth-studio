/**
 * Track Slice - DAW Store
 *
 * Manages DAW track operations:
 * - Track CRUD (create, read, update, delete)
 * - Track audio properties (volume, pan, mute, solo)
 * - Effects management
 * - Stem loading
 *
 * @module stores/daw/slices/trackSlice
 * @since v4.1.0
 */

import { StateCreator } from 'zustand';
import { logInfo, logError } from '@/utils/logger';
import { DAWTrack, DAWEffect, createDefaultTrack, generateId } from '../types';
import type { TrackStem } from '@/types/domain/track.types';
import type { ProjectSlice } from './projectSlice';

// ==========================================
// SLICE STATE
// ==========================================

export interface TrackSlice {
  // Track Actions
  addTrack: (type: 'audio' | 'stem', name?: string, stemType?: string) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<DAWTrack>) => void;
  duplicateTrack: (trackId: string) => void;
  clearAllTracks: () => void;

  // Audio Properties
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackArm: (trackId: string) => void;

  // Effects
  addEffect: (trackId: string, effect: Omit<DAWEffect, 'id'>) => void;
  removeEffect: (trackId: string, effectId: string) => void;
  updateEffect: (trackId: string, effectId: string, updates: Partial<DAWEffect>) => void;
  toggleEffect: (trackId: string, effectId: string) => void;

  // Stem Loading
  loadStemsAsMultitrack: (stems: TrackStem[], parentTrackTitle: string) => void;

  // Utilities
  getTrackById: (trackId: string) => DAWTrack | null;
  getTracks: () => DAWTrack[];
}

// ==========================================
// SLICE CREATOR
// ==========================================

export const createTrackSlice: StateCreator<
  TrackSlice & ProjectSlice,
  [],
  [],
  TrackSlice
> = (set, get) => ({
  // ==========================================
  // TRACK ACTIONS
  // ==========================================

  addTrack: (type: 'audio' | 'stem', name?: string, stemType?: string) => {
    set((state) => {
      if (!state.project) return state;

      const trackName = name || `${type === 'stem' ? stemType || 'Stem' : 'Audio'} ${state.project.tracks.length}`;
      const track = createDefaultTrack(type, trackName, stemType);

      logInfo(`Adding ${type} track: ${trackName}`, 'TrackSlice', { trackId: track.id });

      return {
        project: {
          ...state.project,
          tracks: [...state.project.tracks, track],
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  removeTrack: (trackId: string) => {
    set((state) => {
      if (!state.project) return state;
      if (trackId === 'master') {
        logError('Cannot remove master track', new Error('Invalid operation'), 'TrackSlice');
        return state;
      }

      logInfo(`Removing track: ${trackId}`, 'TrackSlice');

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.filter((t) => t.id !== trackId),
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  updateTrack: (trackId: string, updates: Partial<DAWTrack>) => {
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((track) =>
            track.id === trackId ? { ...track, ...updates } : track
          ),
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  duplicateTrack: (trackId: string) => {
    set((state) => {
      if (!state.project) return state;

      const track = state.project.tracks.find((t) => t.id === trackId);
      if (!track) return state;

      const duplicated: DAWTrack = {
        ...track,
        id: generateId(),
        name: `${track.name} (Copy)`,
        clips: track.clips.map((clip) => ({ ...clip, id: generateId(), trackId: '' })),
      };
      duplicated.clips.forEach((clip) => (clip.trackId = duplicated.id));

      logInfo(`Duplicating track: ${track.name}`, 'TrackSlice', { newTrackId: duplicated.id });

      return {
        project: {
          ...state.project,
          tracks: [...state.project.tracks, duplicated],
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  clearAllTracks: () => {
    set((state) => {
      if (!state.project) return state;

      const masterTrack = state.project.tracks.find((t) => t.type === 'master');
      if (!masterTrack) return state;

      logInfo('Clearing all non-master tracks', 'TrackSlice');

      return {
        project: {
          ...state.project,
          tracks: [masterTrack],
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  // ==========================================
  // AUDIO PROPERTIES
  // ==========================================

  setTrackVolume: (trackId: string, volume: number) => {
    const clampedVolume = Math.max(0, Math.min(2, volume));
    get().updateTrack(trackId, { volume: clampedVolume });
  },

  setTrackPan: (trackId: string, pan: number) => {
    const clampedPan = Math.max(-1, Math.min(1, pan));
    get().updateTrack(trackId, { pan: clampedPan });
  },

  toggleTrackMute: (trackId: string) => {
    const track = get().getTrackById(trackId);
    if (track) {
      get().updateTrack(trackId, { isMuted: !track.isMuted });
    }
  },

  toggleTrackSolo: (trackId: string) => {
    const track = get().getTrackById(trackId);
    if (track) {
      get().updateTrack(trackId, { isSolo: !track.isSolo });
    }
  },

  toggleTrackArm: (trackId: string) => {
    const track = get().getTrackById(trackId);
    if (track) {
      get().updateTrack(trackId, { isArmed: !track.isArmed });
    }
  },

  // ==========================================
  // EFFECTS
  // ==========================================

  addEffect: (trackId: string, effect: Omit<DAWEffect, 'id'>) => {
    const track = get().getTrackById(trackId);
    if (!track) return;

    const newEffect: DAWEffect = { ...effect, id: generateId() };

    logInfo(`Adding effect ${effect.type} to track ${trackId}`, 'TrackSlice');

    get().updateTrack(trackId, {
      effects: [...track.effects, newEffect],
    });
  },

  removeEffect: (trackId: string, effectId: string) => {
    const track = get().getTrackById(trackId);
    if (!track) return;

    logInfo(`Removing effect ${effectId} from track ${trackId}`, 'TrackSlice');

    get().updateTrack(trackId, {
      effects: track.effects.filter((e) => e.id !== effectId),
    });
  },

  updateEffect: (trackId: string, effectId: string, updates: Partial<DAWEffect>) => {
    const track = get().getTrackById(trackId);
    if (!track) return;

    get().updateTrack(trackId, {
      effects: track.effects.map((effect) =>
        effect.id === effectId ? { ...effect, ...updates } : effect
      ),
    });
  },

  toggleEffect: (trackId: string, effectId: string) => {
    const track = get().getTrackById(trackId);
    if (!track) return;

    const effect = track.effects.find((e) => e.id === effectId);
    if (effect) {
      get().updateEffect(trackId, effectId, { enabled: !effect.enabled });
    }
  },

  // ==========================================
  // STEM LOADING
  // ==========================================

  loadStemsAsMultitrack: (stems: TrackStem[], parentTrackTitle: string) => {
    logInfo(`Loading ${stems.length} stems as multitrack`, 'TrackSlice', { parentTrackTitle });

    stems.forEach((stem) => {
      get().addTrack('stem', `${parentTrackTitle} - ${stem.stem_type}`, stem.stem_type);
    });
  },

  // ==========================================
  // UTILITIES
  // ==========================================

  getTrackById: (trackId: string): DAWTrack | null => {
    const { project } = get();
    if (!project) return null;
    return project.tracks.find((t) => t.id === trackId) || null;
  },

  getTracks: (): DAWTrack[] => {
    const { project } = get();
    return project?.tracks || [];
  },
});
