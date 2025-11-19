/**
 * History Slice - DAW Store
 *
 * Manages undo/redo history for DAW operations:
 * - History stack management
 * - Undo/redo operations
 * - History snapshot creation
 * - History navigation
 *
 * @module stores/daw/slices/historySlice
 * @since v4.1.0
 */

import { StateCreator } from 'zustand';
import { logInfo, logError } from '@/utils/logger';
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
  clearHistory: () => void;

  // Utilities
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistoryLength: () => number;
}

// ==========================================
// CONSTANTS
// ==========================================

const MAX_HISTORY_SIZE = 50; // Maximum number of undo states

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
  // UNDO/REDO ACTIONS
  // ==========================================

  undo: () => {
    const { history, historyIndex, project } = get();

    if (historyIndex <= 0) {
      logInfo('Cannot undo: at beginning of history', 'HistorySlice', {
        historyIndex,
        historyLength: history.length,
      });
      return;
    }

    const previousIndex = historyIndex - 1;
    const previousProject = history[previousIndex];

    if (!previousProject) {
      logError('Undo failed: previous project not found', new Error('Invalid history state'), 'HistorySlice', {
        historyIndex,
        previousIndex,
      });
      return;
    }

    logInfo(`Undo: reverting to history state ${previousIndex}`, 'HistorySlice', {
      currentIndex: historyIndex,
      newIndex: previousIndex,
      projectName: previousProject.name,
    });

    set({
      project: previousProject,
      historyIndex: previousIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex >= history.length - 1) {
      logInfo('Cannot redo: at end of history', 'HistorySlice', {
        historyIndex,
        historyLength: history.length,
      });
      return;
    }

    const nextIndex = historyIndex + 1;
    const nextProject = history[nextIndex];

    if (!nextProject) {
      logError('Redo failed: next project not found', new Error('Invalid history state'), 'HistorySlice', {
        historyIndex,
        nextIndex,
      });
      return;
    }

    logInfo(`Redo: advancing to history state ${nextIndex}`, 'HistorySlice', {
      currentIndex: historyIndex,
      newIndex: nextIndex,
      projectName: nextProject.name,
    });

    set({
      project: nextProject,
      historyIndex: nextIndex,
    });
  },

  pushHistory: () => {
    const { project, history, historyIndex } = get();

    if (!project) {
      logError('Cannot push history: no project loaded', new Error('No project'), 'HistorySlice');
      return;
    }

    // Create deep copy of project for history
    const projectSnapshot = JSON.parse(JSON.stringify(project)) as DAWProject;

    // If we're not at the end of history, remove all states after current index
    const newHistory = history.slice(0, historyIndex + 1);

    // Add new state
    newHistory.push(projectSnapshot);

    // Limit history size (FIFO - remove oldest if exceeded)
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();

      logInfo('History size limit reached, removing oldest state', 'HistorySlice', {
        maxSize: MAX_HISTORY_SIZE,
        removedStates: 1,
      });

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    } else {
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    }

    logInfo('History state pushed', 'HistorySlice', {
      historyIndex: newHistory.length - 1,
      historyLength: newHistory.length,
      projectName: project.name,
      trackCount: project.tracks.length,
    });
  },

  clearHistory: () => {
    const { history } = get();

    logInfo('Clearing history', 'HistorySlice', {
      clearedStates: history.length,
    });

    set({
      history: [],
      historyIndex: -1,
    });
  },

  // ==========================================
  // UTILITIES
  // ==========================================

  canUndo: (): boolean => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: (): boolean => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  getHistoryLength: (): number => {
    const { history } = get();
    return history.length;
  },
});
