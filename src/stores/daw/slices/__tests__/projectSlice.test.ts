import { create } from 'zustand';
import { describe, it, expect, beforeEach } from 'vitest';
import { type ProjectSlice, createProjectSlice } from '../projectSlice';

// Create a mock store for testing
const useTestStore = create<ProjectSlice>()((...args) => ({
  ...createProjectSlice(...args),
}));

// Reset state before each test
beforeEach(() => {
  useTestStore.setState({ project: null }, true);
});

describe('createProjectSlice', () => {
  it('should create a new project with default settings', () => {
    useTestStore.getState().createProject('My Test Project');

    const project = useTestStore.getState().project;
    expect(project).not.toBeNull();
    expect(project?.name).toBe('My Test Project');
    expect(project?.bpm).toBe(120);
    expect(project?.masterVolume).toBe(1);
    expect(project?.tracks).toHaveLength(1); // Master track
    expect(project?.tracks[0].type).toBe('master');
  });

  it('should load an existing project', () => {
    const existingProject = {
      id: 'proj-1',
      name: 'Existing Project',
      bpm: 140,
      masterVolume: 0.8,
      tracks: [],
      markers: [],
      regions: [],
      timeSignature: [4, 4] as [number, number],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    useTestStore.getState().loadProject(existingProject);

    const project = useTestStore.getState().project;
    expect(project?.id).toBe('proj-1');
    expect(project?.name).toBe('Existing Project');
    expect(project?.bpm).toBe(140);
  });

  it('should update the project name', () => {
    useTestStore.getState().createProject('Original Name');
    useTestStore.getState().updateProjectName('Updated Name');

    const project = useTestStore.getState().project;
    expect(project?.name).toBe('Updated Name');
  });

  it('should update the project BPM', () => {
    useTestStore.getState().createProject('Test Project');
    useTestStore.getState().updateBPM(160);

    const project = useTestStore.getState().project;
    expect(project?.bpm).toBe(160);
  });

  it('should add a marker', () => {
    useTestStore.getState().createProject('Test Project');
    useTestStore.getState().addMarker(10, 'Chorus Start');

    const project = useTestStore.getState().project;
    expect(project?.markers).toHaveLength(1);
    expect(project?.markers[0].label).toBe('Chorus Start');
    expect(project?.markers[0].time).toBe(10);
  });

  it('should remove a marker', () => {
    useTestStore.getState().createProject('Test Project');
    useTestStore.getState().addMarker(10, 'Marker 1');
    const markerId = useTestStore.getState().project?.markers[0].id;

    useTestStore.getState().removeMarker(markerId!);

    const project = useTestStore.getState().project;
    expect(project?.markers).toHaveLength(0);
  });

  it('should add a region', () => {
    useTestStore.getState().createProject('Test Project');
    useTestStore.getState().addRegion(20, 40, 'Verse 1');

    const project = useTestStore.getState().project;
    expect(project?.regions).toHaveLength(1);
    expect(project?.regions[0].label).toBe('Verse 1');
    expect(project?.regions[0].startTime).toBe(20);
    expect(project?.regions[0].endTime).toBe(40);
  });

  it('should remove a region', () => {
    useTestStore.getState().createProject('Test Project');
    useTestStore.getState().addRegion(20, 40, 'Region 1');
    const regionId = useTestStore.getState().project?.regions[0].id;

    useTestStore.getState().removeRegion(regionId!);

    const project = useTestStore.getState().project;
    expect(project?.regions).toHaveLength(0);
  });
});
