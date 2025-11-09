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

import React, { useState, useCallback, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { ProjectContext, MusicProject, ProjectInsert, ProjectUpdate } from './project/context';

// Import new React Query hooks
import {
  useProjectsQuery,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/projects';

// Контекст и типы вынесены в отдельный модуль ./project/context

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

// Хук перенесён в отдельный файл ./project/useProjects
