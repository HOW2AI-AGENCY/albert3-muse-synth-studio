/**
 * DAW (Digital Audio Workstation) Store
 *
 * Centralized state management for the DAW editor with:
 * - Multi-track audio editing
 * - Timeline management with zoom/snap
 * - Stem and clip management
 * - Undo/redo history
 * - Project save/load
 *
 * @module stores/dawStore
 * @since v4.0.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { logger, logInfo, logError } from '@/utils/logger';
import { TrackStem } from '@/types/domain/track.types';

// ==========================================
// TYPES
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

export interface DAWEffect {
  id: string;
  type: 'eq' | 'compressor' | 'reverb' | 'delay' | 'chorus' | 'distortion';
  enabled: boolean;
  params: Record<string, number>;
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
// STORE INTERFACE
// ==========================================

interface DAWState {
  // ==========================================
  // STATE
  // ==========================================
  project: DAWProject | null;
  timeline: TimelineState;
  selection: SelectionState;
  clipboard: ClipboardState;
  isPlaying: boolean;
  isRecording: boolean;

  // Undo/Redo
  history: DAWProject[];
  historyIndex: number;

  // UI State
  toolMode: 'select' | 'cut' | 'draw' | 'erase';

  // ==========================================
  // PROJECT ACTIONS
  // ==========================================
  createProject: (name: string) => void;
  loadProject: (project: DAWProject) => void;
  saveProject: () => Promise<void>;
  updateProjectName: (name: string) => void;
  updateBPM: (bpm: number) => void;

  // ==========================================
  // TRACK ACTIONS
  // ==========================================
  addTrack: (type: 'audio' | 'stem', name?: string) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<DAWTrack>) => void;
  duplicateTrack: (trackId: string) => void;

  // Load stems from existing track
  loadStemsAsMultitrack: (stems: TrackStem[], parentTrackTitle: string) => void;

  // ==========================================
  // CLIP ACTIONS
  // ==========================================
  addClip: (trackId: string, clip: Omit<DAWClip, 'id' | 'trackId'>) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<DAWClip>) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  duplicateClip: (clipId: string) => void;

  // ==========================================
  // TIMELINE ACTIONS
  // ==========================================
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setLoop: (start: number | null, end: number | null) => void;
  toggleLoop: () => void;
  setZoom: (zoom: number) => void;
  setScroll: (scrollLeft: number) => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;

  // ==========================================
  // SELECTION ACTIONS
  // ==========================================
  selectClip: (clipId: string, addToSelection?: boolean) => void;
  selectTrack: (trackId: string, addToSelection?: boolean) => void;
  selectRegion: (start: number, end: number) => void;
  clearSelection: () => void;

  // ==========================================
  // CLIPBOARD ACTIONS
  // ==========================================
  cutSelected: () => void;
  copySelected: () => void;
  paste: (targetTrackId: string, time: number) => void;
  deleteSelected: () => void;

  // ==========================================
  // MARKER/REGION ACTIONS
  // ==========================================
  addMarker: (time: number, label: string) => void;
  removeMarker: (markerId: string) => void;
  addRegion: (start: number, end: number, label: string) => void;
  removeRegion: (regionId: string) => void;

  // ==========================================
  // EFFECT ACTIONS
  // ==========================================
  addEffect: (trackId: string, effect: Omit<DAWEffect, 'id'>) => void;
  removeEffect: (trackId: string, effectId: string) => void;
  updateEffect: (trackId: string, effectId: string, updates: Partial<DAWEffect>) => void;
  toggleEffect: (trackId: string, effectId: string) => void;

  // ==========================================
  // UNDO/REDO
  // ==========================================
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // ==========================================
  // UTILITY
  // ==========================================
  setToolMode: (mode: 'select' | 'cut' | 'draw' | 'erase') => void;
  snapTimeToGrid: (time: number) => number;
  getTrackByClipId: (clipId: string) => DAWTrack | null;
}

// ==========================================
// HELPERS
// ==========================================

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createDefaultProject = (name: string): DAWProject => ({
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
      height: 120,
    },
  ],
  markers: [],
  regions: [],
  masterVolume: 1.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createDefaultTimeline = (): TimelineState => ({
  currentTime: 0,
  duration: 300, // 5 minutes default
  zoom: 60, // 60 pixels per second
  scrollLeft: 0,
  loopStart: null,
  loopEnd: null,
  isLooping: false,
  snapToGrid: true,
  gridSize: 1, // 1 beat
});

// ==========================================
// STORE
// ==========================================

export const useDAWStore = create<DAWState>()(
  devtools(
    persist(
      (set, get) => ({
        // ==========================================
        // INITIAL STATE
        // ==========================================
        project: null,
        timeline: createDefaultTimeline(),
        selection: {
          selectedClipIds: new Set(),
          selectedTrackIds: new Set(),
          selectedRegion: null,
        },
        clipboard: {
          clips: [],
          cutMode: false,
        },
        isPlaying: false,
        isRecording: false,
        history: [],
        historyIndex: -1,
        toolMode: 'select',

        // ==========================================
        // PROJECT ACTIONS
        // ==========================================
        createProject: (name) => {
          const project = createDefaultProject(name);
          set({
            project,
            timeline: createDefaultTimeline(),
            history: [project],
            historyIndex: 0,
          });
          logInfo('DAW project created', 'dawStore', { projectId: project.id, name });
        },

        loadProject: (project) => {
          set({
            project,
            timeline: createDefaultTimeline(),
            history: [project],
            historyIndex: 0,
          });
          logInfo('DAW project loaded', 'dawStore', { projectId: project.id });
        },

        saveProject: async () => {
          const { project } = get();
          if (!project) {
            logError('Cannot save project: no project loaded', new Error('No project'), 'dawStore');
            return;
          }

          try {
            // TODO: Implement Supabase storage for DAW projects
            logInfo('DAW project saved', 'dawStore', { projectId: project.id });
          } catch (error) {
            logError('Failed to save DAW project', error as Error, 'dawStore', { projectId: project.id });
          }
        },

        updateProjectName: (name) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                name,
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        updateBPM: (bpm) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                bpm,
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        // ==========================================
        // TRACK ACTIONS
        // ==========================================
        addTrack: (type, name) => {
          set((state) => {
            if (!state.project) return state;

            const trackNumber = state.project.tracks.filter(t => t.type === type).length + 1;
            const defaultName = type === 'audio' ? `Audio ${trackNumber}` : `Stem ${trackNumber}`;

            const newTrack: DAWTrack = {
              id: generateId(),
              name: name || defaultName,
              type,
              clips: [],
              volume: 0.8,
              pan: 0,
              isMuted: false,
              isSolo: false,
              isArmed: false,
              effects: [],
              height: 120,
            };

            return {
              project: {
                ...state.project,
                tracks: [...state.project.tracks, newTrack],
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        removeTrack: (trackId) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.filter(t => t.id !== trackId),
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        updateTrack: (trackId, updates) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === trackId ? { ...t, ...updates } : t
                ),
                updated_at: new Date().toISOString(),
              },
            };
          });
          // Don't push to history for volume/pan changes (too frequent)
          if (!('volume' in updates) && !('pan' in updates)) {
            get().pushHistory();
          }
        },

        duplicateTrack: (trackId) => {
          set((state) => {
            if (!state.project) return state;

            const track = state.project.tracks.find(t => t.id === trackId);
            if (!track) return state;

            const newTrack: DAWTrack = {
              ...track,
              id: generateId(),
              name: `${track.name} (Copy)`,
              clips: track.clips.map(clip => ({
                ...clip,
                id: generateId(),
                trackId: generateId(),
              })),
            };

            return {
              project: {
                ...state.project,
                tracks: [...state.project.tracks, newTrack],
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        loadStemsAsMultitrack: (stems, parentTrackTitle) => {
          set((state) => {
            if (!state.project) return state;

            const stemTracks: DAWTrack[] = stems.map((stem, index) => ({
              id: generateId(),
              name: stem.stem_type.replace('_', ' ').toUpperCase(),
              type: 'stem' as const,
              stemType: stem.stem_type,
              clips: [
                {
                  id: generateId(),
                  trackId: generateId(),
                  stemId: stem.id,
                  name: stem.stem_type,
                  audioUrl: stem.audio_url,
                  startTime: 0,
                  duration: 180, // Default 3 min, will be updated on load
                  offset: 0,
                  volume: 1.0,
                  fadeIn: 0,
                  fadeOut: 0,
                },
              ],
              volume: 0.8,
              pan: 0,
              isMuted: false,
              isSolo: false,
              isArmed: false,
              effects: [],
              height: 120,
              color: getStemColor(stem.stem_type),
            }));

            return {
              project: {
                ...state.project,
                tracks: [...state.project.tracks, ...stemTracks],
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
          logInfo('Stems loaded as multitrack', 'dawStore', {
            stemCount: stems.length,
            parentTrack: parentTrackTitle
          });
        },

        // ==========================================
        // CLIP ACTIONS
        // ==========================================
        addClip: (trackId, clipData) => {
          set((state) => {
            if (!state.project) return state;

            const clip: DAWClip = {
              id: generateId(),
              trackId,
              ...clipData,
            };

            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === trackId
                    ? { ...t, clips: [...t.clips, clip] }
                    : t
                ),
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        removeClip: (clipId) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t => ({
                  ...t,
                  clips: t.clips.filter(c => c.id !== clipId),
                })),
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        updateClip: (clipId, updates) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t => ({
                  ...t,
                  clips: t.clips.map(c =>
                    c.id === clipId ? { ...c, ...updates } : c
                  ),
                })),
                updated_at: new Date().toISOString(),
              },
            };
          });
          // Don't push to history for drag operations (too frequent)
          if (!('startTime' in updates)) {
            get().pushHistory();
          }
        },

        splitClip: (clipId, splitTime) => {
          set((state) => {
            if (!state.project) return state;

            const track = state.project.tracks.find(t =>
              t.clips.some(c => c.id === clipId)
            );
            if (!track) return state;

            const clip = track.clips.find(c => c.id === clipId);
            if (!clip) return state;

            const relativeTime = splitTime - clip.startTime;
            if (relativeTime <= 0 || relativeTime >= clip.duration) return state;

            const leftClip: DAWClip = {
              ...clip,
              duration: relativeTime,
            };

            const rightClip: DAWClip = {
              ...clip,
              id: generateId(),
              startTime: splitTime,
              offset: clip.offset + relativeTime,
              duration: clip.duration - relativeTime,
            };

            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === track.id
                    ? {
                        ...t,
                        clips: [
                          ...t.clips.filter(c => c.id !== clipId),
                          leftClip,
                          rightClip,
                        ],
                      }
                    : t
                ),
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        duplicateClip: (clipId) => {
          set((state) => {
            if (!state.project) return state;

            const track = state.project.tracks.find(t =>
              t.clips.some(c => c.id === clipId)
            );
            if (!track) return state;

            const clip = track.clips.find(c => c.id === clipId);
            if (!clip) return state;

            const newClip: DAWClip = {
              ...clip,
              id: generateId(),
              startTime: clip.startTime + clip.duration,
            };

            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === track.id
                    ? { ...t, clips: [...t.clips, newClip] }
                    : t
                ),
                updated_at: new Date().toISOString(),
              },
            };
          });
          get().pushHistory();
        },

        // ==========================================
        // TIMELINE ACTIONS
        // ==========================================
        play: () => {
          set({ isPlaying: true });
        },

        pause: () => {
          set({ isPlaying: false });
        },

        stop: () => {
          set({
            isPlaying: false,
            timeline: { ...get().timeline, currentTime: 0 },
          });
        },

        seekTo: (time) => {
          set((state) => ({
            timeline: { ...state.timeline, currentTime: time },
          }));
        },

        setLoop: (start, end) => {
          set((state) => ({
            timeline: {
              ...state.timeline,
              loopStart: start,
              loopEnd: end,
              isLooping: start !== null && end !== null,
            },
          }));
        },

        toggleLoop: () => {
          set((state) => ({
            timeline: {
              ...state.timeline,
              isLooping: !state.timeline.isLooping,
            },
          }));
        },

        setZoom: (zoom) => {
          set((state) => ({
            timeline: { ...state.timeline, zoom: Math.max(10, Math.min(500, zoom)) },
          }));
        },

        setScroll: (scrollLeft) => {
          set((state) => ({
            timeline: { ...state.timeline, scrollLeft: Math.max(0, scrollLeft) },
          }));
        },

        toggleSnapToGrid: () => {
          set((state) => ({
            timeline: { ...state.timeline, snapToGrid: !state.timeline.snapToGrid },
          }));
        },

        setGridSize: (size) => {
          set((state) => ({
            timeline: { ...state.timeline, gridSize: size },
          }));
        },

        // ==========================================
        // SELECTION ACTIONS
        // ==========================================
        selectClip: (clipId, addToSelection = false) => {
          set((state) => {
            const newSelection = addToSelection
              ? new Set(state.selection.selectedClipIds)
              : new Set<string>();

            if (newSelection.has(clipId)) {
              newSelection.delete(clipId);
            } else {
              newSelection.add(clipId);
            }

            return {
              selection: {
                ...state.selection,
                selectedClipIds: newSelection,
              },
            };
          });
        },

        selectTrack: (trackId, addToSelection = false) => {
          set((state) => {
            const newSelection = addToSelection
              ? new Set(state.selection.selectedTrackIds)
              : new Set<string>();

            if (newSelection.has(trackId)) {
              newSelection.delete(trackId);
            } else {
              newSelection.add(trackId);
            }

            return {
              selection: {
                ...state.selection,
                selectedTrackIds: newSelection,
              },
            };
          });
        },

        selectRegion: (start, end) => {
          set((state) => ({
            selection: {
              ...state.selection,
              selectedRegion: { start, end },
            },
          }));
        },

        clearSelection: () => {
          set({
            selection: {
              selectedClipIds: new Set(),
              selectedTrackIds: new Set(),
              selectedRegion: null,
            },
          });
        },

        // ==========================================
        // CLIPBOARD ACTIONS
        // ==========================================
        cutSelected: () => {
          const { project, selection } = get();
          if (!project) return;

          const clipsToCut: DAWClip[] = [];
          project.tracks.forEach(track => {
            track.clips.forEach(clip => {
              if (selection.selectedClipIds.has(clip.id)) {
                clipsToCut.push(clip);
              }
            });
          });

          set({
            clipboard: {
              clips: clipsToCut,
              cutMode: true,
            },
          });

          // Remove clips from tracks
          clipsToCut.forEach(clip => {
            get().removeClip(clip.id);
          });
        },

        copySelected: () => {
          const { project, selection } = get();
          if (!project) return;

          const clipsToCopy: DAWClip[] = [];
          project.tracks.forEach(track => {
            track.clips.forEach(clip => {
              if (selection.selectedClipIds.has(clip.id)) {
                clipsToCopy.push(clip);
              }
            });
          });

          set({
            clipboard: {
              clips: clipsToCopy,
              cutMode: false,
            },
          });
        },

        paste: (targetTrackId, time) => {
          const { clipboard, snapTimeToGrid } = get();

          const pasteTime = snapTimeToGrid(time);

          clipboard.clips.forEach(clip => {
            get().addClip(targetTrackId, {
              name: clip.name,
              audioUrl: clip.audioUrl,
              stemId: clip.stemId,
              startTime: pasteTime + (clip.startTime - clipboard.clips[0].startTime),
              duration: clip.duration,
              offset: clip.offset,
              volume: clip.volume,
              fadeIn: clip.fadeIn,
              fadeOut: clip.fadeOut,
              color: clip.color,
            });
          });
        },

        deleteSelected: () => {
          const { selection } = get();
          selection.selectedClipIds.forEach(clipId => {
            get().removeClip(clipId);
          });
          get().clearSelection();
        },

        // ==========================================
        // MARKER/REGION ACTIONS
        // ==========================================
        addMarker: (time, label) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                markers: [
                  ...state.project.markers,
                  { id: generateId(), time, label },
                ],
              },
            };
          });
          get().pushHistory();
        },

        removeMarker: (markerId) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                markers: state.project.markers.filter(m => m.id !== markerId),
              },
            };
          });
          get().pushHistory();
        },

        addRegion: (start, end, label) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                regions: [
                  ...state.project.regions,
                  { id: generateId(), startTime: start, endTime: end, label },
                ],
              },
            };
          });
          get().pushHistory();
        },

        removeRegion: (regionId) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                regions: state.project.regions.filter(r => r.id !== regionId),
              },
            };
          });
          get().pushHistory();
        },

        // ==========================================
        // EFFECT ACTIONS
        // ==========================================
        addEffect: (trackId, effectData) => {
          set((state) => {
            if (!state.project) return state;

            const effect: DAWEffect = {
              id: generateId(),
              ...effectData,
            };

            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === trackId
                    ? { ...t, effects: [...t.effects, effect] }
                    : t
                ),
              },
            };
          });
          get().pushHistory();
        },

        removeEffect: (trackId, effectId) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === trackId
                    ? { ...t, effects: t.effects.filter(e => e.id !== effectId) }
                    : t
                ),
              },
            };
          });
          get().pushHistory();
        },

        updateEffect: (trackId, effectId, updates) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === trackId
                    ? {
                        ...t,
                        effects: t.effects.map(e =>
                          e.id === effectId ? { ...e, ...updates } : e
                        ),
                      }
                    : t
                ),
              },
            };
          });
          // Don't push to history for param changes (too frequent)
          if (!('params' in updates)) {
            get().pushHistory();
          }
        },

        toggleEffect: (trackId, effectId) => {
          set((state) => {
            if (!state.project) return state;
            return {
              project: {
                ...state.project,
                tracks: state.project.tracks.map(t =>
                  t.id === trackId
                    ? {
                        ...t,
                        effects: t.effects.map(e =>
                          e.id === effectId ? { ...e, enabled: !e.enabled } : e
                        ),
                      }
                    : t
                ),
              },
            };
          });
        },

        // ==========================================
        // UNDO/REDO
        // ==========================================
        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            set({
              project: history[newIndex],
              historyIndex: newIndex,
            });
            logInfo('Undo', 'dawStore', { historyIndex: newIndex });
          }
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            set({
              project: history[newIndex],
              historyIndex: newIndex,
            });
            logInfo('Redo', 'dawStore', { historyIndex: newIndex });
          }
        },

        pushHistory: () => {
          const { project, history, historyIndex } = get();
          if (!project) return;

          // Truncate history after current index
          const newHistory = history.slice(0, historyIndex + 1);

          // Add current state
          newHistory.push(JSON.parse(JSON.stringify(project)));

          // Limit history to 50 states
          if (newHistory.length > 50) {
            newHistory.shift();
          }

          set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
          });
        },

        // ==========================================
        // UTILITY
        // ==========================================
        setToolMode: (mode) => {
          set({ toolMode: mode });
        },

        snapTimeToGrid: (time) => {
          const { timeline, project } = get();
          if (!timeline.snapToGrid || !project) return time;

          const beatDuration = 60 / project.bpm;
          const gridDuration = beatDuration * timeline.gridSize;

          return Math.round(time / gridDuration) * gridDuration;
        },

        getTrackByClipId: (clipId) => {
          const { project } = get();
          if (!project) return null;

          return project.tracks.find(t =>
            t.clips.some(c => c.id === clipId)
          ) || null;
        },
      }),
      {
        name: 'daw-storage',
        partialize: (state) => ({
          // Don't persist playback state
          project: state.project,
          toolMode: state.toolMode,
        }),
      }
    ),
    {
      name: 'DAWStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const getStemColor = (stemType: string): string => {
  const colors: Record<string, string> = {
    vocals: '#3b82f6', // blue
    backing_vocals: '#6366f1', // indigo
    drums: '#ef4444', // red
    bass: '#8b5cf6', // purple
    guitar: '#f59e0b', // amber
    keyboard: '#10b981', // green
    instrumental: '#6b7280', // gray
    original: '#14b8a6', // teal
  };
  return colors[stemType] || '#9ca3af'; // default gray
};

// ==========================================
// SELECTORS
// ==========================================

export const useDAWProject = () =>
  useDAWStore((state) => state.project);

export const useDAWTimeline = () =>
  useDAWStore((state) => state.timeline);

export const useDAWTracks = () =>
  useDAWStore((state) => state.project?.tracks || []);

export const useDAWSelection = () =>
  useDAWStore((state) => state.selection);

export const useDAWIsPlaying = () =>
  useDAWStore((state) => state.isPlaying);

export const useDAWControls = () =>
  useDAWStore((state) => ({
    play: state.play,
    pause: state.pause,
    stop: state.stop,
    seekTo: state.seekTo,
  }));
