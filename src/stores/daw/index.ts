/**
 * DAW Store
 *
 * Centralized state management for the DAW editor, composed of multiple slices:
 * - Project: Core project data (tracks, metadata)
 * - Timeline: Playback and view state
 * - Track: Track operations
 * - Clip: Clip operations and selection
 * - History: Undo/redo
 *
 * @module stores/daw
 * @since v4.1.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';
import { createTimelineSlice, TimelineSlice } from './slices/timelineSlice';
import { createTrackSlice, TrackSlice } from './slices/trackSlice';
import { createClipSlice, ClipSlice } from './slices/clipSlice';
import { createHistorySlice, HistorySlice } from './slices/historySlice';

export * from './types';

// ==========================================
// STORE INTERFACE
// ==========================================

export type DAWState = ProjectSlice &
    TimelineSlice &
    TrackSlice &
    ClipSlice &
    HistorySlice;

// ==========================================
// STORE CREATOR
// ==========================================

export const useDAWStore = create<DAWState>()(
    devtools(
        persist(
            (...a) => ({
                ...createProjectSlice(...a),
                ...createTimelineSlice(...a),
                ...createTrackSlice(...a),
                ...createClipSlice(...a),
                ...createHistorySlice(...a),
            }),
            {
                name: 'daw-storage',
                partialize: (state) => ({
                    // Persist project and UI state, but not playback state
                    project: state.project,
                    toolMode: state.toolMode,
                    // Timeline state that should be persisted
                    timeline: {
                        ...state.timeline,
                        currentTime: 0, // Reset playhead on load
                        isPlaying: false,
                    },
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
// SELECTORS
// ==========================================

export const useDAWProject = () => useDAWStore((state) => state.project);
export const useDAWTimeline = () => useDAWStore((state) => state.timeline);
export const useDAWTracks = () => useDAWStore((state) => state.project?.tracks || []);
export const useDAWSelection = () => useDAWStore((state) => state.selection);
export const useDAWIsPlaying = () => useDAWStore((state) => state.isPlaying);

export const useDAWControls = () =>
    useDAWStore((state) => ({
        play: state.play,
        pause: state.pause,
        stop: state.stop,
        seekTo: state.seekTo,
    }));
