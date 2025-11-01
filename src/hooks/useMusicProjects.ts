/**
 * Music Projects Hook
 * Manages CRUD operations for music projects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MusicProject, CreateProjectParams, UpdateProjectParams } from '@/types/project.types';
import { logger } from '@/utils/logger';

export const useMusicProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['music-projects'],
    queryFn: async () => {
      logger.info('Fetching projects', 'useMusicProjects');
      const { data, error } = await supabase
        .from('music_projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        logger.error('Failed to fetch projects', error as Error, 'useMusicProjects');
        throw error;
      }
      
      return data as MusicProject[];
    }
  });

  // Create project
  const createProject = useMutation({
    mutationFn: async (params: CreateProjectParams) => {
      logger.info('Creating project', 'useMusicProjects', { name: params.name });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('music_projects')
        .insert({
          user_id: user.id,
          ...params
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MusicProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['music-projects'] });
      toast({
        title: 'Проект создан',
        description: `"${data.name}" успешно создан`,
      });
    },
    onError: (error) => {
      logger.error('Failed to create project', error as Error, 'useMusicProjects');
      toast({
        title: 'Ошибка создания',
        description: 'Не удалось создать проект',
        variant: 'destructive',
      });
    }
  });

  // Update project
  const updateProject = useMutation({
    mutationFn: async ({ id, ...params }: UpdateProjectParams) => {
      logger.info('Updating project', 'useMusicProjects', { id });
      const { data, error } = await supabase
        .from('music_projects')
        .update(params)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MusicProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music-projects'] });
      toast({
        title: 'Проект обновлён',
        description: 'Изменения сохранены',
      });
    },
    onError: (error) => {
      logger.error('Failed to update project', error as Error, 'useMusicProjects');
      toast({
        title: 'Ошибка обновления',
        description: 'Не удалось сохранить изменения',
        variant: 'destructive',
      });
    }
  });

  // Delete project
  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      logger.info('Deleting project', 'useMusicProjects', { id });
      const { error } = await supabase
        .from('music_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music-projects'] });
      toast({
        title: 'Проект удалён',
        description: 'Проект успешно удалён',
      });
    },
    onError: (error) => {
      logger.error('Failed to delete project', error as Error, 'useMusicProjects');
      toast({
        title: 'Ошибка удаления',
        description: 'Не удалось удалить проект',
        variant: 'destructive',
      });
    }
  });

  return {
    projects,
    isLoading,
    createProject: createProject.mutate,
    updateProject: updateProject.mutate,
    deleteProject: deleteProject.mutate,
    isCreating: createProject.isPending,
    isUpdating: updateProject.isPending,
    isDeleting: deleteProject.isPending,
  };
};
