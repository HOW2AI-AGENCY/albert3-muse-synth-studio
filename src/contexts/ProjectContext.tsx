/**
 * Project Context Provider
 * Now powered by React Query for better caching and performance
 *
 * Migration Notes:
 * - Uses useProjectsQuery for automatic caching
 * - Uses mutation hooks for optimistic updates
 * - Maintains same API for backward compatibility
 *
 * @version 2.0.0 - Migrated to React Query
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

// Import new React Query hooks
import {
  useProjectsQuery,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/projects';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];
type ProjectInsert = Database['public']['Tables']['music_projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['music_projects']['Update'];

interface ProjectContextValue {
  selectedProject: MusicProject | null;
  setSelectedProject: (project: MusicProject | null) => void;
  projects: MusicProject[];
  isLoading: boolean;
  createProject: (params: ProjectInsert) => Promise<MusicProject | null>;
  updateProject: (id: string, params: ProjectUpdate) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProject, setSelectedProject] = useState<MusicProject | null>(null);

  // ✅ Use React Query hooks for data fetching
  const { projects, isLoading, refetch, invalidate } = useProjectsQuery();

  // ✅ Use mutation hooks with optimistic updates
  const { createProject: createMutation } = useCreateProject();
  const { updateProject: updateMutation } = useUpdateProject();
  const { deleteProject: deleteMutation } = useDeleteProject();

  // ✅ Wrap createProject to maintain backward compatibility
  const createProject = useCallback(async (params: ProjectInsert): Promise<MusicProject | null> => {
    try {
      const project = await createMutation(params);
      logger.info('Project created via context', 'ProjectContext', {
        projectId: project.id,
        name: project.name
      });
      return project;
    } catch (error) {
      logger.error('Failed to create project via context', error as Error, 'ProjectContext');
      return null;
    }
  }, [createMutation]);

  // ✅ Wrap updateProject to maintain backward compatibility
  const updateProject = useCallback(async (id: string, params: ProjectUpdate) => {
    try {
      await updateMutation({ id, updates: params });
      logger.info('Project updated via context', 'ProjectContext', { projectId: id });
    } catch (error) {
      logger.error('Failed to update project via context', error as Error, 'ProjectContext', {
        projectId: id
      });
    }
  }, [updateMutation]);

  // ✅ Wrap deleteProject with auto-deselect logic
  const deleteProject = useCallback(async (id: string) => {
    try {
      await deleteMutation(id);

      // Auto-deselect if we deleted the selected project
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }

      logger.info('Project deleted via context', 'ProjectContext', { projectId: id });
    } catch (error) {
      logger.error('Failed to delete project via context', error as Error, 'ProjectContext', {
        projectId: id
      });
    }
  }, [deleteMutation, selectedProject]);

  // ✅ Wrap refetch for backward compatibility
  const refreshProjects = useCallback(async () => {
    try {
      await refetch();
      // Also invalidate to ensure fresh data
      invalidate();
    } catch (error) {
      logger.error('Failed to refresh projects', error as Error, 'ProjectContext');
    }
  }, [refetch, invalidate]);

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        projects,
        isLoading,
        createProject,
        updateProject,
        deleteProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
