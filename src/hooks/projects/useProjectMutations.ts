/**
 * Projects Mutation Hooks
 * Handles create, update, delete operations with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth/useAuth';
import { logger } from '@/utils/logger';
import { projectsKeys } from './useProjectsQuery';
import type { Database } from '@/integrations/supabase/types';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];
type ProjectInsert = Database['public']['Tables']['music_projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['music_projects']['Update'];

/**
 * Hook for creating a new project
 *
 * Features:
 * - Optimistic updates
 * - Automatic query invalidation
 * - Toast notifications
 * - Error handling
 *
 * @example
 * ```tsx
 * const { createProject, isCreating } = useCreateProject();
 *
 * const handleCreate = async () => {
 *   const project = await createProject({
 *     name: 'My Project',
 *     description: 'Description'
 *   });
 *   if (project) {
 *     navigate(`/projects/${project.id}`);
 *   }
 * };
 * ```
 */
export const useCreateProject = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: Omit<ProjectInsert, 'user_id'>): Promise<MusicProject> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('music_projects')
        .insert({ ...params, user_id: userId })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create project', error, 'useCreateProject');
        throw error;
      }

      logger.info('Project created', 'useCreateProject', {
        projectId: data.id,
        name: data.name
      });

      return data;
    },

    // Optimistic update: add project immediately to UI
    onMutate: async (newProject) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectsKeys.list(userId) });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<MusicProject[]>(
        projectsKeys.list(userId)
      );

      // Optimistically update to new value
      if (previousProjects && userId) {
        const optimisticProject: MusicProject = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          name: newProject.name || 'New Project',
          description: newProject.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_tracks: 0,
          completed_tracks: 0,
          // Используем валидное значение enum project_type согласно миграции
          project_type: 'single',
          is_public: false,
          ai_generation_params: null,
          concept_description: null,
          cover_url: null,
          created_with_ai: false,
          genre: null,
          last_activity_at: new Date().toISOString(),
          mood: null,
          persona_id: null,
          planned_tracks: null,
          story_theme: null,
          style_tags: null,
          tempo_range: null,
          total_duration: null,
          visual_references: null,
        };

        queryClient.setQueryData<MusicProject[]>(
          projectsKeys.list(userId),
          [...previousProjects, optimisticProject]
        );
      }

      return { previousProjects };
    },

    // On error, rollback to previous value
    onError: (error, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(
          projectsKeys.list(userId),
          context.previousProjects
        );
      }

      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать проект',
        variant: 'destructive',
      });
    },

    // On success, invalidate and refetch
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.list(userId) });

      toast({
        title: '✅ Проект создан',
        description: `"${data.name}" успешно создан`,
      });
    },
  });

  return {
    createProject: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};

/**
 * Hook for updating a project
 *
 * @example
 * ```tsx
 * const { updateProject, isUpdating } = useUpdateProject();
 *
 * await updateProject({
 *   id: projectId,
 *   updates: { name: 'Updated Name' }
 * });
 * ```
 */
export const useUpdateProject = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectUpdate }) => {
      const { error } = await supabase
        .from('music_projects')
        .update(updates)
        .eq('id', id);

      if (error) {
        logger.error('Failed to update project', error, 'useUpdateProject', { id });
        throw error;
      }

      logger.info('Project updated', 'useUpdateProject', { id });
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: projectsKeys.list(userId) });

      const previousProjects = queryClient.getQueryData<MusicProject[]>(
        projectsKeys.list(userId)
      );

      if (previousProjects) {
        queryClient.setQueryData<MusicProject[]>(
          projectsKeys.list(userId),
          previousProjects.map((project) =>
            project.id === id
              ? { ...project, ...updates, updated_at: new Date().toISOString() }
              : project
          )
        );
      }

      return { previousProjects };
    },

    onError: (error, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(
          projectsKeys.list(userId),
          context.previousProjects
        );
      }

      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить проект',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.list(userId) });

      toast({
        title: '✅ Проект обновлён',
        description: 'Изменения сохранены',
      });
    },
  });

  return {
    updateProject: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook for deleting a project
 *
 * @example
 * ```tsx
 * const { deleteProject, isDeleting } = useDeleteProject();
 *
 * await deleteProject(projectId);
 * ```
 */
export const useDeleteProject = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('music_projects')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Failed to delete project', error, 'useDeleteProject', { id });
        throw error;
      }

      logger.info('Project deleted', 'useDeleteProject', { id });
    },

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectsKeys.list(userId) });

      const previousProjects = queryClient.getQueryData<MusicProject[]>(
        projectsKeys.list(userId)
      );

      if (previousProjects) {
        queryClient.setQueryData<MusicProject[]>(
          projectsKeys.list(userId),
          previousProjects.filter((project) => project.id !== id)
        );
      }

      return { previousProjects };
    },

    onError: (error, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(
          projectsKeys.list(userId),
          context.previousProjects
        );
      }

      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить проект',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.list(userId) });

      toast({
        title: '✅ Проект удалён',
        description: 'Проект успешно удалён',
      });
    },
  });

  return {
    deleteProject: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
