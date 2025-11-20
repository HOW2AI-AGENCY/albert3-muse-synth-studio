import { create } from 'zustand';
import { describe, it, expect, beforeEach } from 'vitest';
import { type TimelineSlice, createTimelineSlice } from '../timelineSlice';
import { type ProjectSlice, createProjectSlice } from '../projectSlice';
import { type TrackSlice, createTrackSlice } from '../trackSlice';
import { type ClipSlice, createClipSlice } from '../clipSlice';
import { type HistorySlice, createHistorySlice } from '../historySlice';
import { DAWStore } from '../..';

// Create a mock store with all slices for testing
const useTestStore = create<DAWStore>()((...args) => ({
    ...createProjectSlice(...args),
    ...createTimelineSlice(...args),
    ...createTrackSlice(...args),
    ...createClipSlice(...args),
    ...createHistorySlice(...args),
}));

// Reset state before each test
beforeEach(() => {
    useTestStore.setState({
        isPlaying: false,
        isRecording: false,
        toolMode: 'select',
        timeline: {
        currentTime: 0,
        duration: 120, // 2 minutes
        zoom: 60,
        scrollLeft: 0,
        loopStart: null,
        loopEnd: null,
        isLooping: false,
        snapToGrid: true,
        gridSize: 1,
        },
        project: null,
        history: [],
        historyIndex: -1,
        selection: {
            selectedClipIds: new Set(),
            selectedTrackIds: new Set(),
            selectedRegion: null,
        },
        clipboard: {
            clips: [],
            cutMode: false,
        }
    }, true);
    useTestStore.getState().createProject('Test Project');
});

describe('createTimelineSlice', () => {
  it('should play', () => {
    useTestStore.getState().play();
    expect(useTestStore.getState().isPlaying).toBe(true);
  });

  it('should pause', () => {
    useTestStore.getState().play();
    useTestStore.getState().pause();
    expect(useTestStore.getState().isPlaying).toBe(false);
  });

  it('should stop and reset time', () => {
    useTestStore.getState().play();
    useTestStore.getState().seekTo(30);
    useTestStore.getState().stop();
    expect(useTestStore.getState().isPlaying).toBe(false);
    expect(useTestStore.getState().timeline.currentTime).toBe(0);
  });

  it('should seek to a specific time', () => {
    useTestStore.getState().seekTo(45);
    expect(useTestStore.getState().timeline.currentTime).toBe(45);
  });

  it('should not seek beyond duration', () => {
    useTestStore.getState().updateDuration(120);
    useTestStore.getState().seekTo(150);
    expect(useTestStore.getState().timeline.currentTime).toBe(120);
  });

  it('should not seek before 0', () => {
    useTestStore.getState().seekTo(-20);
    expect(useTestStore.getState().timeline.currentTime).toBe(0);
  });

  it('should set and enable loop', () => {
    useTestStore.getState().setLoop(10, 20);
    const timeline = useTestStore.getState().timeline;
    expect(timeline.loopStart).toBe(10);
    expect(timeline.loopEnd).toBe(20);
    expect(timeline.isLooping).toBe(true);
  });

  it('should clear loop', () => {
    useTestStore.getState().setLoop(10, 20);
    useTestStore.getState().clearLoop();
    const timeline = useTestStore.getState().timeline;
    expect(timeline.loopStart).toBeNull();
    expect(timeline.loopEnd).toBeNull();
    expect(timeline.isLooping).toBe(false);
  });

  it('should toggle loop', () => {
    useTestStore.getState().setLoop(10, 20);
    useTestStore.getState().toggleLoop();
    expect(useTestStore.getState().timeline.isLooping).toBe(false);
    useTestStore.getState().toggleLoop();
    expect(useTestStore.getState().timeline.isLooping).toBe(true);
  });
});
