/**
 * useProjectPrompts Hook - Управление промптами проекта
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';

export type PromptCategory = 'music' | 'lyrics' | 'style' | 'concept' | 'general';

export interface ProjectPrompt {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  content: string;
  category?: PromptCategory;
  tags?: string[];
  is_favorite?: boolean;
  usage_count?: number;
  last_used_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface CreatePromptParams {
  project_id?: string;
  title: string;
  content: string;
  category?: PromptCategory;
  tags?: string[];
}

export const useProjectPrompts = (projectId?: string, category?: PromptCategory) => {
  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['project-prompts', projectId, category],
    queryFn: async () => {
      let query = supabase
        .from('project_prompts')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProjectPrompt[];
    },
  });

  if (error) {
    logger.error('Failed to fetch prompts', error as Error, 'useProjectPrompts', { projectId, category });
  }

  return { prompts, isLoading, error };
};

export const useCreatePrompt = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreatePromptParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_prompts')
        .insert({
          user_id: user.id,
          project_id: params.project_id,
          title: params.title,
          content: params.content,
          category: params.category || 'general',
          tags: params.tags || [],
          is_favorite: false,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProjectPrompt;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-prompts', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
      toast({
        title: 'Промпт создан',
        description: 'Промпт успешно сохранен',
      });
    },
    onError: (error) => {
      logger.error('Failed to create prompt', error as Error, 'useCreatePrompt');
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать промпт',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdatePrompt = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectPrompt> }) => {
      const { data, error } = await supabase
        .from('project_prompts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectPrompt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-prompts', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
      toast({
        title: 'Промпт обновлен',
        description: 'Изменения сохранены',
      });
    },
    onError: (error) => {
      logger.error('Failed to update prompt', error as Error, 'useUpdatePrompt');
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить промпт',
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePrompt = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase
        .from('project_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
      toast({
        title: 'Промпт удален',
        description: 'Промпт успешно удален',
      });
    },
    onError: (error) => {
      logger.error('Failed to delete prompt', error as Error, 'useDeletePrompt');
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить промпт',
        variant: 'destructive',
      });
    },
  });
};

export const useUsePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promptId: string) => {
      // Increment usage count manually since RPC doesn't exist yet
      const { data: currentPrompt } = await supabase
        .from('project_prompts')
        .select('usage_count')
        .eq('id', promptId)
        .single();

      const { data, error } = await supabase
        .from('project_prompts')
        .update({
          usage_count: (currentPrompt?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', promptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
    },
    onError: (error) => {
      logger.error('Failed to increment prompt usage', error as Error, 'useUsePrompt');
    },
  });
};
