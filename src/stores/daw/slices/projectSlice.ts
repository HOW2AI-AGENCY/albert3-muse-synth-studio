/**
 * Project Slice - DAW Store
 *
 * Manages DAW project state and operations:
 * - Project creation and loading
 * - Project metadata (name, BPM, time signature)
 * - Markers and regions
 * - Project persistence
 *
 * @module stores/daw/slices/projectSlice
 * @since v4.1.0
 */

import { StateCreator } from 'zustand';
import { logInfo, logError } from '@/utils/logger';
import {
  DAWProject,
  DAWMarker,
  DAWRegion,
  createDefaultProject,
  generateId,
} from '../types';

// ==========================================
// SLICE STATE
// ==========================================

export interface ProjectSlice {
  // State
  project: DAWProject | null;

  // Actions
  createProject: (name: string) => void;
  loadProject: (project: DAWProject) => void;
  saveProject: () => Promise<void>;
  updateProjectName: (name: string) => void;
  updateBPM: (bpm: number) => void;
  updateTimeSignature: (timeSignature: [number, number]) => void;
  updateMasterVolume: (volume: number) => void;

  // Markers
  addMarker: (time: number, label: string) => void;
  removeMarker: (markerId: string) => void;
  updateMarker: (markerId: string, updates: Partial<DAWMarker>) => void;

  // Regions
  addRegion: (start: number, end: number, label: string) => void;
  removeRegion: (regionId: string) => void;
  updateRegion: (regionId: string, updates: Partial<DAWRegion>) => void;
}

// ==========================================
// SLICE CREATOR
// ==========================================

export const createProjectSlice: StateCreator<ProjectSlice> = (set, get) => ({
  // ==========================================
  // INITIAL STATE
  // ==========================================
  project: null,

  // ==========================================
  // PROJECT ACTIONS
  // ==========================================

  createProject: (name: string) => {
    const project = createDefaultProject(name);
    logInfo(`Creating new DAW project: ${name}`, 'ProjectSlice', { projectId: project.id });

    set({ project });
  },

  loadProject: (project: DAWProject) => {
    logInfo(`Loading DAW project: ${project.name}`, 'ProjectSlice', { projectId: project.id });

    set({ project: { ...project, updated_at: new Date().toISOString() } });
  },

  saveProject: async () => {
    const { project } = get();
    if (!project) {
      logError('Cannot save project: no project loaded', new Error('No project'), 'ProjectSlice');
      return;
    }

    try {
      // Update timestamp
      const updatedProject = {
        ...project,
        updated_at: new Date().toISOString(),
      };

      set({ project: updatedProject });

      // TODO: Implement actual save logic (Supabase, localStorage, etc.)
      // For now, just log
      logInfo(`Saved DAW project: ${project.name}`, 'ProjectSlice', {
        projectId: project.id,
        trackCount: project.tracks.length,
      });
    } catch (error) {
      logError('Failed to save DAW project', error as Error, 'ProjectSlice', {
        projectId: project.id,
      });
      throw error;
    }
  },

  updateProjectName: (name: string) => {
    set((state) => {
      if (!state.project) return state;

      logInfo(`Updating project name: ${name}`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          name,
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  updateBPM: (bpm: number) => {
    set((state) => {
      if (!state.project) return state;

      logInfo(`Updating project BPM: ${bpm}`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          bpm,
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  updateTimeSignature: (timeSignature: [number, number]) => {
    set((state) => {
      if (!state.project) return state;

      logInfo(`Updating time signature: ${timeSignature.join('/')}`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          timeSignature,
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  updateMasterVolume: (volume: number) => {
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          masterVolume: Math.max(0, Math.min(2, volume)), // Clamp 0-2
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  // ==========================================
  // MARKER ACTIONS
  // ==========================================

  addMarker: (time: number, label: string) => {
    set((state) => {
      if (!state.project) return state;

      const marker: DAWMarker = {
        id: generateId(),
        time,
        label,
      };

      logInfo(`Adding marker: ${label} at ${time}s`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          markers: [...state.project.markers, marker],
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  removeMarker: (markerId: string) => {
    set((state) => {
      if (!state.project) return state;

      logInfo(`Removing marker: ${markerId}`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          markers: state.project.markers.filter((m) => m.id !== markerId),
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  updateMarker: (markerId: string, updates: Partial<DAWMarker>) => {
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          markers: state.project.markers.map((marker) =>
            marker.id === markerId ? { ...marker, ...updates } : marker
          ),
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  // ==========================================
  // REGION ACTIONS
  // ==========================================

  addRegion: (start: number, end: number, label: string) => {
    set((state) => {
      if (!state.project) return state;

      const region: DAWRegion = {
        id: generateId(),
        startTime: start,
        endTime: end,
        label,
      };

      logInfo(`Adding region: ${label} (${start}s - ${end}s)`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          regions: [...state.project.regions, region],
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  removeRegion: (regionId: string) => {
    set((state) => {
      if (!state.project) return state;

      logInfo(`Removing region: ${regionId}`, 'ProjectSlice', {
        projectId: state.project.id,
      });

      return {
        project: {
          ...state.project,
          regions: state.project.regions.filter((r) => r.id !== regionId),
          updated_at: new Date().toISOString(),
        },
      };
    });
  },

  updateRegion: (regionId: string, updates: Partial<DAWRegion>) => {
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          regions: state.project.regions.map((region) =>
            region.id === regionId ? { ...region, ...updates } : region
          ),
          updated_at: new Date().toISOString(),
        },
      };
    });
  },
});
