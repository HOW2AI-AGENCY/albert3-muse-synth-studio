import { create } from 'zustand';
import { describe, it, expect, beforeEach } from 'vitest';
import { type HistorySlice, createHistorySlice } from '../historySlice';
import { type ProjectSlice, createProjectSlice } from '../projectSlice';

// Create a mock store that combines both slices for testing
const useTestStore = create<ProjectSlice & HistorySlice>()((...args) => ({
  ...createProjectSlice(...args),
  ...createHistorySlice(...args),
}));

// Reset state before each test
beforeEach(() => {
  useTestStore.getState().clearHistory();
  useTestStore.getState().createProject('History Test');
  useTestStore.getState().pushHistory(); // Initial state
});

describe('createHistorySlice', () => {
  it('should push a new state to history', () => {
    useTestStore.getState().updateProjectName('State 1');
    useTestStore.getState().pushHistory();

    expect(useTestStore.getState().getHistoryLength()).toBe(2);
    expect(useTestStore.getState().historyIndex).toBe(1);
    expect(useTestStore.getState().history[1].name).toBe('State 1');
  });

  it('should undo to the previous state', () => {
    useTestStore.getState().updateProjectName('State 1');
    useTestStore.getState().pushHistory();
    useTestStore.getState().updateProjectName('State 2');
    useTestStore.getState().pushHistory();

    useTestStore.getState().undo();

    expect(useTestStore.getState().project?.name).toBe('State 1');
    expect(useTestStore.getState().historyIndex).toBe(1);
  });

  it('should not undo if at the beginning of history', () => {
    useTestStore.getState().undo(); // Try to undo initial state

    expect(useTestStore.getState().project?.name).toBe('History Test');
    expect(useTestStore.getState().historyIndex).toBe(0);
  });

  it('should redo to the next state', () => {
    useTestStore.getState().updateProjectName('State 1');
    useTestStore.getState().pushHistory();
    useTestStore.getState().undo();

    useTestStore.getState().redo();

    expect(useTestStore.getState().project?.name).toBe('State 1');
    expect(useTestStore.getState().historyIndex).toBe(1);
  });

  it('should not redo if at the end of history', () => {
    useTestStore.getState().updateProjectName('State 1');
    useTestStore.getState().pushHistory();

    useTestStore.getState().redo(); // Try to redo

    expect(useTestStore.getState().project?.name).toBe('State 1');
    expect(useTestStore.getState().historyIndex).toBe(1);
  });

  it('should clear all future states when a change is made after undo', () => {
    useTestStore.getState().updateProjectName('State 1');
    useTestStore.getState().pushHistory();
    useTestStore.getState().updateProjectName('State 2');
    useTestStore.getState().pushHistory();
    useTestStore.getState().undo(); // Back to 'State 1'

    useTestStore.getState().updateProjectName('New State 2');
    useTestStore.getState().pushHistory();

    expect(useTestStore.getState().getHistoryLength()).toBe(3);
    expect(useTestStore.getState().project?.name).toBe('New State 2');

    // Should not be able to redo to the old 'State 2'
    useTestStore.getState().redo();
    expect(useTestStore.getState().project?.name).toBe('New State 2');
  });

  it('should clear the entire history', () => {
    useTestStore.getState().updateProjectName('State 1');
    useTestStore.getState().pushHistory();

    useTestStore.getState().clearHistory();

    expect(useTestStore.getState().getHistoryLength()).toBe(0);
    expect(useTestStore.getState().historyIndex).toBe(-1);
  });
});
