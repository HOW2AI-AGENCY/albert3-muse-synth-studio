import { create } from 'zustand';
import { describe, it, expect, beforeEach } from 'vitest';
import { type ClipSlice, createClipSlice } from '../clipSlice';
import { type ProjectSlice, createProjectSlice } from '../projectSlice';
import { type TrackSlice, createTrackSlice } from '../trackSlice';

// Create a mock store that combines all necessary slices for testing
const useTestStore = create<ProjectSlice & TrackSlice & ClipSlice>()((...args) => ({
  ...createProjectSlice(...args),
  ...createTrackSlice(...args),
  ...createClipSlice(...args),
}));

// Helper to get the first non-master track
const getFirstTrackId = () => useTestStore.getState().getTracks()[1].id;

// Reset state before each test
beforeEach(() => {
  useTestStore.getState().createProject('Test Project');
  useTestStore.getState().addTrack('audio', 'Audio 1');
});

describe('createClipSlice', () => {
  it('should add a clip to a track', () => {
    const trackId = getFirstTrackId();
    useTestStore.getState().addClip(trackId, {
      name: 'New Clip',
      audioUrl: 'test.mp3',
      startTime: 0,
      duration: 10,
      offset: 0,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    });

    const track = useTestStore.getState().getTrackById(trackId);
    expect(track?.clips).toHaveLength(1);
    expect(track?.clips[0].name).toBe('New Clip');
  });

  it('should remove a clip', () => {
    const trackId = getFirstTrackId();
    useTestStore.getState().addClip(trackId, { name: 'To Remove', audioUrl: '', startTime: 0, duration: 5, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 });
    const clipId = useTestStore.getState().getTrackById(trackId)!.clips[0].id;

    useTestStore.getState().removeClip(clipId);

    const track = useTestStore.getState().getTrackById(trackId);
    expect(track?.clips).toHaveLength(0);
  });

  it('should update a clip', () => {
    const trackId = getFirstTrackId();
    useTestStore.getState().addClip(trackId, { name: 'Initial', audioUrl: '', startTime: 0, duration: 10, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 });
    const clipId = useTestStore.getState().getTrackById(trackId)!.clips[0].id;

    useTestStore.getState().updateClip(clipId, { name: 'Updated', startTime: 5 });

    const updatedClip = useTestStore.getState().getClipById(clipId);
    expect(updatedClip?.name).toBe('Updated');
    expect(updatedClip?.startTime).toBe(5);
  });

  it('should split a clip into two', () => {
    const trackId = getFirstTrackId();
    useTestStore.getState().addClip(trackId, { name: 'To Split', audioUrl: '', startTime: 0, duration: 20, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 });
    const clipId = useTestStore.getState().getTrackById(trackId)!.clips[0].id;

    useTestStore.getState().splitClip(clipId, 10);

    const track = useTestStore.getState().getTrackById(trackId);
    expect(track?.clips).toHaveLength(2);

    const leftClip = track!.clips.find(c => c.duration === 10);
    const rightClip = track!.clips.find(c => c.startTime === 10);

    expect(leftClip).toBeDefined();
    expect(rightClip).toBeDefined();
    expect(leftClip?.duration).toBe(10);
    expect(rightClip?.startTime).toBe(10);
    expect(rightClip?.duration).toBe(10);
    expect(rightClip?.offset).toBe(10);
  });

  it('should select a single clip', () => {
    const trackId = getFirstTrackId();
    useTestStore.getState().addClip(trackId, { name: 'Clip 1', audioUrl: '', startTime: 0, duration: 5, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 });
    const clipId = useTestStore.getState().getTrackById(trackId)!.clips[0].id;

    useTestStore.getState().selectClip(clipId);

    const { selectedClipIds } = useTestStore.getState().selection;
    expect(selectedClipIds.size).toBe(1);
    expect(selectedClipIds.has(clipId)).toBe(true);
  });

  it('should add a clip to the current selection', () => {
    const trackId = getFirstTrackId();
    useTestStore.getState().addClip(trackId, { name: 'Clip 1', audioUrl: '', startTime: 0, duration: 5, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 });
    useTestStore.getState().addClip(trackId, { name: 'Clip 2', audioUrl: '', startTime: 10, duration: 5, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 });
    const clips = useTestStore.getState().getTrackById(trackId)!.clips;

    useTestStore.getState().selectClip(clips[0].id);
    useTestStore.getState().selectClip(clips[1].id, true);

    const { selectedClipIds } = useTestStore.getState().selection;
    expect(selectedClipIds.size).toBe(2);
    expect(selectedClipIds.has(clips[0].id)).toBe(true);
    expect(selectedClipIds.has(clips[1].id)).toBe(true);
  });
});
