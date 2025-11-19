/**
 * DAW Store - Unified Store
 *
 * Combines all DAW slices into a single Zustand store:
 * - ProjectSlice: Project management
 * - TimelineSlice: Timeline and playback
 * - TrackSlice: Track operations
 * - ClipSlice: Clip management and selection
 * - HistorySlice: Undo/redo
 *
 * @module stores/daw
 * @since v4.1.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { logInfo } from '@/utils/logger';

import { ProjectSlice, createProjectSlice } from './slices/projectSlice';
import { TimelineSlice, createTimelineSlice } from './slices/timelineSlice';
import { TrackSlice, createTrackSlice } from './slices/trackSlice';
import { ClipSlice, createClipSlice } from './slices/clipSlice';
import { HistorySlice, createHistorySlice } from './slices/historySlice';

// ==========================================
// COMBINED STORE TYPE
// ==========================================

export type DAWStore = ProjectSlice &
  TimelineSlice &
  TrackSlice &
  ClipSlice &
  HistorySlice;

// ==========================================
// STORE CREATION
// ==========================================

export const useDAWStore = create<DAWStore>()(
  devtools(
    persist(
      (...a) => ({
        // Combine all slices
        ...createProjectSlice(...a),
        ...createTimelineSlice(...a),
        ...createTrackSlice(...a),
        ...createClipSlice(...a),
        ...createHistorySlice(...a),
      }),
      {
        name: 'daw-store',
        // Only persist essential state, not transient UI state
        partialize: (state) => ({
          project: state.project,
          // Don't persist: timeline, selection, clipboard, history
        }),
        onRehydrateStorage: () => {
          logInfo('Rehydrating DAW store from persistence', 'DAWStore');

          return (state, error) => {
            if (error) {
              logInfo('Failed to rehydrate DAW store', 'DAWStore', { error });
            } else if (state?.project) {
              logInfo('DAW store rehydrated successfully', 'DAWStore', {
                projectName: state.project.name,
                trackCount: state.project.tracks.length,
              });
            }
          };
        },
      }
    ),
    {
      name: 'DAW Store',
      enabled: import.meta.env.DEV, // Only enable devtools in development
    }
  )
);

// ==========================================
// SELECTOR HOOKS (for performance optimization)
// ==========================================

/**
 * Select project name
 */
export const useProjectName = () => useDAWStore((state) => state.project?.name);

/**
 * Select all tracks
 */
export const useTracks = () => useDAWStore((state) => state.project?.tracks || []);

/**
 * Select playback state
 */
export const useIsPlaying = () => useDAWStore((state) => state.isPlaying);

/**
 * Select current time
 */
export const useCurrentTime = () => useDAWStore((state) => state.timeline.currentTime);

/**
 * Select zoom level
 */
export const useZoom = () => useDAWStore((state) => state.timeline.zoom);

/**
 * Select selected clips
 */
export const useSelectedClipIds = () => useDAWStore((state) => state.selection.selectedClipIds);

/**
 * Select undo/redo capabilities
 */
export const useHistoryState = () =>
  useDAWStore((state) => ({
    canUndo: state.canUndo(),
    canRedo: state.canRedo(),
    historyLength: state.getHistoryLength(),
  }));

// ==========================================
// EXPORTS
// ==========================================

// Re-export types for convenience
export type {
  DAWProject,
  DAWTrack,
  DAWClip,
  DAWEffect,
  DAWMarker,
  DAWRegion,
  TimelineState,
  SelectionState,
  ClipboardState,
  ToolMode,
} from './types';

export { generateId, createDefaultProject, createDefaultTrack } from './types';
