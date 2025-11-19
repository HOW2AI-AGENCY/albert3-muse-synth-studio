/**
 * History Slice - DAW Store
 *
 * Manages undo/redo functionality for the DAW:
 * - History stack management
 * - State snapshots
 * - Undo/Redo actions
 *
 * @module stores/daw/slices/historySlice
 * @since v4.1.0
 */

import { StateCreator } from 'zustand';
import { logInfo } from '@/utils/logger';
import { DAWProject } from '../types';
import type { ProjectSlice } from './projectSlice';

// ==========================================
// SLICE STATE
// ==========================================

export interface HistorySlice {
    // State
    history: DAWProject[];
    historyIndex: number;

    // Actions
    undo: () => void;
    redo: () => void;
    pushHistory: () => void;
}

// ==========================================
// SLICE CREATOR
// ==========================================

export const createHistorySlice: StateCreator<
    HistorySlice & ProjectSlice,
    [],
    [],
    HistorySlice
> = (set, get) => ({
    // ==========================================
    // INITIAL STATE
    // ==========================================
    history: [],
    historyIndex: -1,

    // ==========================================
    // ACTIONS
    // ==========================================

    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            set({
                project: history[newIndex],
                historyIndex: newIndex,
            });
            logInfo('Undo', 'HistorySlice', { historyIndex: newIndex });
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
            logInfo('Redo', 'HistorySlice', { historyIndex: newIndex });
        }
    },

    pushHistory: () => {
        const { project, history, historyIndex } = get();
        if (!project) return;

        // Truncate history after current index
        const newHistory = history.slice(0, historyIndex + 1);

        // Add current state
        // Deep copy to ensure we store a snapshot
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
});
