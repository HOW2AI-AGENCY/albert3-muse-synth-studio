/**
 * Hook for auto-saving DAW projects
 * Debounced save with dirty state tracking
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { useDAWProjects } from './useDAWProjects';
import { useDebouncedCallback } from 'use-debounce';
import { logInfo } from '@/utils/logger';

interface UseDAWAutoSaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  projectId?: string;
}

export const useDAWAutoSave = (options: UseDAWAutoSaveOptions = {}) => {
  const {
    enabled = true,
    debounceMs = 5000, // 5 seconds
    projectId,
  } = options;

  const project = useDAWStore((state) => state.project);
  const { saveProject, isSaving } = useDAWProjects();
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Serialize project state for comparison
  const serializeProject = useCallback((proj: typeof project) => {
    if (!proj) return '';
    return JSON.stringify({
      tracks: proj.tracks,
      markers: proj.markers,
      regions: proj.regions,
      bpm: proj.bpm,
      name: proj.name,
    });
  }, []);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!project || !enabled) return;

      const currentState = serializeProject(project);

      // Check if state has changed
      if (currentState === lastSavedStateRef.current) {
        return;
      }

      logInfo('Auto-saving DAW project', 'useDAWAutoSave', { 
        projectName: project.name,
        trackCount: project.tracks.length 
      });

      // Save to Supabase
      saveProject({ projectId });

      // Update last saved state
      lastSavedStateRef.current = currentState;
    },
    debounceMs
  );

  // Track changes and trigger auto-save
  useEffect(() => {
    if (!enabled || !project) return;

    const currentState = serializeProject(project);

    // Skip if no changes
    if (currentState === lastSavedStateRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule debounced save
    debouncedSave();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [project, enabled, serializeProject, debouncedSave]);

  // Force immediate save
  const forceSave = useCallback(() => {
    if (!project) return;

    logInfo('Force saving DAW project', 'useDAWAutoSave');
    saveProject({ projectId });
    lastSavedStateRef.current = serializeProject(project);
  }, [project, projectId, saveProject, serializeProject]);

  // Cleanup on unmount - save if dirty
  useEffect(() => {
    return () => {
      if (project && enabled) {
        const currentState = serializeProject(project);
        if (currentState !== lastSavedStateRef.current) {
          // Synchronous save on unmount
          logInfo('Saving DAW project on unmount', 'useDAWAutoSave');
          forceSave();
        }
      }
    };
  }, [project, enabled, serializeProject, forceSave]);

  return {
    isSaving,
    forceSave,
    lastSaved: lastSavedStateRef.current ? new Date() : null,
  };
};
