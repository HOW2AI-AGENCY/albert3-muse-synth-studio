/**
 * Clip Slice - DAW Store
 *
 * Manages clip operations, selection, and clipboard:
 * - Clip CRUD (create, read, update, delete)
 * - Clip manipulation (split, duplicate, move)
 * - Selection management (clips, tracks, regions)
 * - Clipboard operations (cut, copy, paste)
 *
 * @module stores/daw/slices/clipSlice
 * @since v4.1.0
 */

import { StateCreator } from 'zustand';
import { logInfo, logError } from '@/utils/logger';
import {
    DAWClip,
    SelectionState,
    ClipboardState,
    generateId,
} from '../types';
import type { ProjectSlice } from './projectSlice';

// ==========================================
// SLICE STATE
// ==========================================

export interface ClipSlice {
    // State
    selection: SelectionState;
    clipboard: ClipboardState;

    // Clip Actions
    addClip: (trackId: string, clip: Omit<DAWClip, 'id' | 'trackId'>) => void;
    removeClip: (clipId: string) => void;
    updateClip: (clipId: string, updates: Partial<DAWClip>) => void;
    splitClip: (clipId: string, splitTime: number) => void;
    duplicateClip: (clipId: string) => void;
    moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;

    // Selection Actions
    selectClip: (clipId: string, addToSelection?: boolean) => void;
    selectTrack: (trackId: string, addToSelection?: boolean) => void;
    selectRegion: (start: number, end: number) => void;
    clearSelection: () => void;
    selectAll: () => void;

    // Clipboard Actions
    cutSelected: () => void;
    copySelected: () => void;
    paste: (targetTrackId: string, time: number) => void;
    deleteSelected: () => void;

    // Utilities
    getClipById: (clipId: string) => DAWClip | null;
    getTrackByClipId: (clipId: string) => string | null;
    getSelectedClips: () => DAWClip[];
}

// ==========================================
// SLICE CREATOR
// ==========================================

export const createClipSlice: StateCreator<
    ClipSlice & ProjectSlice,
    [],
    [],
    ClipSlice
> = (set, get) => ({
    // ==========================================
    // INITIAL STATE
    // ==========================================
    selection: {
        selectedClipIds: new Set<string>(),
        selectedTrackIds: new Set<string>(),
        selectedRegion: null,
    },
    clipboard: {
        clips: [],
        cutMode: false,
    },

    // ==========================================
    // CLIP ACTIONS
    // ==========================================

    addClip: (trackId: string, clip: Omit<DAWClip, 'id' | 'trackId'>) => {
        set((state) => {
            if (!state.project) return state;

            const newClip: DAWClip = {
                ...clip,
                id: generateId(),
                trackId,
            };

            logInfo(`Adding clip: ${newClip.name} to track ${trackId}`, 'ClipSlice', {
                clipId: newClip.id,
                startTime: newClip.startTime,
                duration: newClip.duration,
            });

            return {
                project: {
                    ...state.project,
                    tracks: state.project.tracks.map((track) =>
                        track.id === trackId
                            ? { ...track, clips: [...track.clips, newClip] }
                            : track
                    ),
                    updated_at: new Date().toISOString(),
                },
            };
        });
    },

    removeClip: (clipId: string) => {
        set((state) => {
            if (!state.project) return state;

            logInfo(`Removing clip: ${clipId}`, 'ClipSlice');

            return {
                project: {
                    ...state.project,
                    tracks: state.project.tracks.map((track) => ({
                        ...track,
                        clips: track.clips.filter((clip) => clip.id !== clipId),
                    })),
                    updated_at: new Date().toISOString(),
                },
                selection: {
                    ...state.selection,
                    selectedClipIds: new Set(
                        Array.from(state.selection.selectedClipIds).filter((id) => id !== clipId)
                    ),
                },
            };
        });
    },

    updateClip: (clipId: string, updates: Partial<DAWClip>) => {
        set((state) => {
            if (!state.project) return state;

            return {
                project: {
                    ...state.project,
                    tracks: state.project.tracks.map((track) => ({
                        ...track,
                        clips: track.clips.map((clip) =>
                            clip.id === clipId ? { ...clip, ...updates } : clip
                        ),
                    })),
                    updated_at: new Date().toISOString(),
                },
            };
        });
    },

    splitClip: (clipId: string, splitTime: number) => {
        set((state) => {
            if (!state.project) return state;

            const clip = get().getClipById(clipId);
            if (!clip) {
                logError('Cannot split clip: clip not found', new Error('Clip not found'), 'ClipSlice', { clipId });
                return state;
            }

            if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
                logError('Invalid split time', new Error('Split time out of bounds'), 'ClipSlice', { clipId, splitTime });
                return state;
            }

            const leftDuration = splitTime - clip.startTime;
            const rightDuration = clip.duration - leftDuration;

            const leftClip: DAWClip = {
                ...clip,
                duration: leftDuration,
            };

            const rightClip: DAWClip = {
                ...clip,
                id: generateId(),
                startTime: splitTime,
                duration: rightDuration,
                offset: clip.offset + leftDuration,
            };

            logInfo(`Splitting clip ${clipId} at ${splitTime}s`, 'ClipSlice', {
                leftClipId: leftClip.id,
                rightClipId: rightClip.id,
            });

            return {
                project: {
                    ...state.project,
                    tracks: state.project.tracks.map((track) =>
                        track.id === clip.trackId
                            ? {
                                ...track,
                                clips: [
                                    ...track.clips.filter((c) => c.id !== clipId),
                                    leftClip,
                                    rightClip,
                                ],
                            }
                            : track
                    ),
                    updated_at: new Date().toISOString(),
                },
            };
        });
    },

    duplicateClip: (clipId: string) => {
        set((state) => {
            if (!state.project) return state;

            const clip = get().getClipById(clipId);
            if (!clip) return state;

            const duplicated: DAWClip = {
                ...clip,
                id: generateId(),
                name: `${clip.name} (Copy)`,
                startTime: clip.startTime + clip.duration + 0.1, // Offset slightly
            };

            logInfo(`Duplicating clip: ${clip.name}`, 'ClipSlice', { newClipId: duplicated.id });

            return {
                project: {
                    ...state.project,
                    tracks: state.project.tracks.map((track) =>
                        track.id === clip.trackId
                            ? { ...track, clips: [...track.clips, duplicated] }
                            : track
                    ),
                    updated_at: new Date().toISOString(),
                },
            };
        });
    },

    moveClip: (clipId: string, newTrackId: string, newStartTime: number) => {
        set((state) => {
            if (!state.project) return state;

            const clip = get().getClipById(clipId);
            if (!clip) return state;

            const oldTrackId = clip.trackId;

            logInfo(`Moving clip ${clipId} to track ${newTrackId} at ${newStartTime}s`, 'ClipSlice');

            const updatedClip = { ...clip, trackId: newTrackId, startTime: newStartTime };

            return {
                project: {
                    ...state.project,
                    tracks: state.project.tracks.map((track) => {
                        if (track.id === oldTrackId) {
                            return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
                        }
                        if (track.id === newTrackId) {
                            return { ...track, clips: [...track.clips, updatedClip] };
                        }
                        return track;
                    }),
                    updated_at: new Date().toISOString(),
                },
            };
        });
    },

    // ==========================================
    // SELECTION ACTIONS
    // ==========================================

    selectClip: (clipId: string, addToSelection = false) => {
        set((state) => {
            const newSelectedClipIds = addToSelection
                ? new Set([...state.selection.selectedClipIds, clipId])
                : new Set([clipId]);

            return {
                selection: {
                    ...state.selection,
                    selectedClipIds: newSelectedClipIds,
                },
            };
        });
    },

    selectTrack: (trackId: string, addToSelection = false) => {
        set((state) => {
            const newSelectedTrackIds = addToSelection
                ? new Set([...state.selection.selectedTrackIds, trackId])
                : new Set([trackId]);

            return {
                selection: {
                    ...state.selection,
                    selectedTrackIds: newSelectedTrackIds,
                },
            };
        });
    },

    selectRegion: (start: number, end: number) => {
        set((state) => ({
            selection: {
                ...state.selection,
                selectedRegion: { start, end },
            },
        }));
    },

    clearSelection: () => {
        logInfo('Clearing selection', 'ClipSlice');
        set({
            selection: {
                selectedClipIds: new Set(),
                selectedTrackIds: new Set(),
                selectedRegion: null,
            },
        });
    },

    selectAll: () => {
        set((state) => {
            if (!state.project) return state;

            const allClipIds = state.project.tracks.flatMap((track) =>
                track.clips.map((clip) => clip.id)
            );

            logInfo(`Selecting all clips: ${allClipIds.length}`, 'ClipSlice');

            return {
                selection: {
                    ...state.selection,
                    selectedClipIds: new Set(allClipIds),
                },
            };
        });
    },

    // ==========================================
    // CLIPBOARD ACTIONS
    // ==========================================

    cutSelected: () => {
        const selectedClips = get().getSelectedClips();

        logInfo(`Cutting ${selectedClips.length} clips`, 'ClipSlice');

        set({
            clipboard: {
                clips: selectedClips,
                cutMode: true,
            },
        });

        // Remove clips after cutting
        selectedClips.forEach((clip) => get().removeClip(clip.id));
    },

    copySelected: () => {
        const selectedClips = get().getSelectedClips();

        logInfo(`Copying ${selectedClips.length} clips`, 'ClipSlice');

        set({
            clipboard: {
                clips: selectedClips,
                cutMode: false,
            },
        });
    },

    paste: (targetTrackId: string, time: number) => {
        const { clipboard } = get();

        if (clipboard.clips.length === 0) {
            logInfo('Paste cancelled: clipboard empty', 'ClipSlice');
            return;
        }

        logInfo(`Pasting ${clipboard.clips.length} clips to track ${targetTrackId} at ${time}s`, 'ClipSlice');

        clipboard.clips.forEach((clip) => {
            const newClip: Omit<DAWClip, 'id' | 'trackId'> = {
                ...clip,
                startTime: time + (clip.startTime - clipboard.clips[0].startTime),
            };

            get().addClip(targetTrackId, newClip);
        });

        // Clear clipboard if it was a cut operation
        if (clipboard.cutMode) {
            set({
                clipboard: {
                    clips: [],
                    cutMode: false,
                },
            });
        }
    },

    deleteSelected: () => {
        const selectedClips = get().getSelectedClips();

        logInfo(`Deleting ${selectedClips.length} selected clips`, 'ClipSlice');

        selectedClips.forEach((clip) => get().removeClip(clip.id));
        get().clearSelection();
    },

    // ==========================================
    // UTILITIES
    // ==========================================

    getClipById: (clipId: string): DAWClip | null => {
        const { project } = get();
        if (!project) return null;

        for (const track of project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) return clip;
        }

        return null;
    },

    getTrackByClipId: (clipId: string): string | null => {
        const { project } = get();
        if (!project) return null;

        for (const track of project.tracks) {
            if (track.clips.some((c) => c.id === clipId)) {
                return track.id;
            }
        }

        return null;
    },

    getSelectedClips: (): DAWClip[] => {
        const { selection, project } = get();
        if (!project) return [];

        const clips: DAWClip[] = [];

        project.tracks.forEach((track) => {
            track.clips.forEach((clip) => {
                if (selection.selectedClipIds.has(clip.id)) {
                    clips.push(clip);
                }
            });
        });

        return clips;
    },
});
