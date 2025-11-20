import { create } from 'zustand';
import { describe, it, expect, beforeEach } from 'vitest';
import { type TrackSlice, createTrackSlice } from '../trackSlice';
import { type ProjectSlice, createProjectSlice } from '../projectSlice';

// Create a mock store that combines both slices for testing
const useTestStore = create<ProjectSlice & TrackSlice>()((...args) => ({
  ...createProjectSlice(...args),
  ...createTrackSlice(...args),
}));

// Reset state before each test
beforeEach(() => {
  // Create a default project to operate on
  useTestStore.getState().createProject('Test Project');
});

describe('createTrackSlice', () => {
  it('should add a new audio track', () => {
    useTestStore.getState().addTrack('audio', 'My Audio Track');

    const tracks = useTestStore.getState().getTracks();
    expect(tracks).toHaveLength(2); // Master + new track
    expect(tracks[1].name).toBe('My Audio Track');
    expect(tracks[1].type).toBe('audio');
  });

  it('should remove a track', () => {
    useTestStore.getState().addTrack('audio', 'To Be Removed');
    const trackId = useTestStore.getState().getTracks()[1].id;

    useTestStore.getState().removeTrack(trackId);

    const tracks = useTestStore.getState().getTracks();
    expect(tracks).toHaveLength(1); // Only master track left
  });

  it('should not remove the master track', () => {
    const masterTrackId = useTestStore.getState().getTracks()[0].id;
    useTestStore.getState().removeTrack(masterTrackId);

    const tracks = useTestStore.getState().getTracks();
    expect(tracks).toHaveLength(1); // Master track should still exist
  });

  it('should update a track', () => {
    useTestStore.getState().addTrack('audio', 'Initial Name');
    const trackId = useTestStore.getState().getTracks()[1].id;

    useTestStore.getState().updateTrack(trackId, { name: 'Updated Name', volume: 0.75 });

    const updatedTrack = useTestStore.getState().getTrackById(trackId);
    expect(updatedTrack?.name).toBe('Updated Name');
    expect(updatedTrack?.volume).toBe(0.75);
  });

  it('should duplicate a track', () => {
    useTestStore.getState().addTrack('audio', 'Original');
    const trackId = useTestStore.getState().getTracks()[1].id;

    useTestStore.getState().duplicateTrack(trackId);

    const tracks = useTestStore.getState().getTracks();
    expect(tracks).toHaveLength(3);
    expect(tracks[2].name).toBe('Original (Copy)');
    expect(tracks[2].id).not.toBe(trackId);
  });

  it('should toggle mute on a track', () => {
    useTestStore.getState().addTrack('audio', 'Test Mute');
    const trackId = useTestStore.getState().getTracks()[1].id;

    useTestStore.getState().toggleTrackMute(trackId);
    let track = useTestStore.getState().getTrackById(trackId);
    expect(track?.isMuted).toBe(true);

    useTestStore.getState().toggleTrackMute(trackId);
    track = useTestStore.getState().getTrackById(trackId);
    expect(track?.isMuted).toBe(false);
  });
});
