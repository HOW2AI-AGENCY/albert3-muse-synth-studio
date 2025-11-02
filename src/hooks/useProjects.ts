/**
 * useProjects Hook - Управление проектами
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  project_type: 'single' | 'ep' | 'album' | 'soundtrack' | 'custom' | 'instrumental';
  cover_url?: string;
  is_public: boolean;
  created_with_ai: boolean;
  ai_generation_params?: any;
  total_tracks: number;
  completed_tracks: number;
  total_duration: number;
  style_tags?: string[];
  genre?: string;
  mood?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
}

export const useProjects = () => {

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('music_projects')
        .select('*')
        .order('last_activity_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  if (error) {
    logger.error('Failed to fetch projects', error as Error, 'useProjects');
  }

  return { projects, isLoading, error };
};

export const useProject = (projectId: string | undefined) => {

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('music_projects')
        .select(`
          *,
          project_tracks (
            track_id,
            position,
            added_at,
            tracks (*)
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  if (error) {
    logger.error('Failed to fetch project', error as Error, 'useProject', { projectId });
  }

  return { project, isLoading, error };
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectData: Partial<Project>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('music_projects')
        .insert({
          name: projectData.name || 'Новый проект',
          user_id: user.id,
          description: projectData.description,
          project_type: projectData.project_type || 'single',
          cover_url: projectData.cover_url,
          is_public: projectData.is_public || false,
          created_with_ai: projectData.created_with_ai || false,
          ai_generation_params: projectData.ai_generation_params,
          style_tags: projectData.style_tags,
          genre: projectData.genre,
          mood: projectData.mood,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Проект создан',
        description: 'Ваш новый музыкальный проект успешно создан',
      });
    },
    onError: (error) => {
      logger.error('Failed to create project', error as Error, 'useCreateProject');
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать проект',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { data, error } = await supabase
        .from('music_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      toast({
        title: 'Проект обновлен',
        description: 'Изменения сохранены',
      });
    },
    onError: (error) => {
      logger.error('Failed to update project', error as Error, 'useUpdateProject');
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить проект',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('music_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Проект удален',
        description: 'Проект успешно удален',
      });
    },
    onError: (error) => {
      logger.error('Failed to delete project', error as Error, 'useDeleteProject');
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить проект',
        variant: 'destructive',
      });
    },
  });
};
