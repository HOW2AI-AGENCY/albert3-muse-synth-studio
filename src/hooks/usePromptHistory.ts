import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

type PromptProvider = 'suno' | 'mureka';

interface PromptHistoryItem {
  id: string;
  prompt: string;
  lyrics?: string;
  style_tags?: string[];
  genre?: string;
  mood?: string;
  provider?: string;
  is_template: boolean;
  template_name?: string;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

export const usePromptHistory = () => {
  const queryClient = useQueryClient();

  // Fetch history
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['prompt-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_history')
        .select('*')
        .order('last_used_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('[usePromptHistory] Fetch failed:', error);
        throw error;
      }

      return data as PromptHistoryItem[];
    },
  });

  // Fetch templates only
  const { data: templates = [] } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_history')
        .select('*')
        .eq('is_template', true)
        .order('template_name');

      if (error) {
        logger.error('[usePromptHistory] Templates fetch failed:', error);
        throw error;
      }

      return data as PromptHistoryItem[];
    },
  });

  // Save prompt
  const savePrompt = useMutation({
    mutationFn: async (params: {
      prompt: string;
      lyrics?: string;
      style_tags?: string[];
      genre?: string;
      mood?: string;
      provider?: PromptProvider;
      is_template?: boolean;
      template_name?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('prompt_history')
        .insert({
          user_id: user.id,
          prompt: params.prompt,
          lyrics: params.lyrics,
          style_tags: params.style_tags,
          genre: params.genre,
          mood: params.mood,
          provider: params.provider || 'suno',
          is_template: params.is_template || false,
          template_name: params.template_name,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-history'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });

  // Update usage
  const updateUsage = useMutation({
    mutationFn: async (id: string) => {
      // First get current usage count
      const { data: current } = await supabase
        .from('prompt_history')
        .select('usage_count')
        .eq('id', id)
        .single();

      const newUsageCount = (current?.usage_count || 0) + 1;

      const { error } = await supabase
        .from('prompt_history')
        .update({
          usage_count: newUsageCount,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-history'] });
    },
  });

  // Delete prompt
  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompt_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-history'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      toast({ description: 'Промпт удален' });
    },
  });

  // Save as template
  const saveAsTemplate = useMutation({
    mutationFn: async ({ id, template_name }: { id: string; template_name: string }) => {
      const { error } = await supabase
        .from('prompt_history')
        .update({
          is_template: true,
          template_name,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-history'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      toast({ description: 'Сохранено как шаблон' });
    },
  });

  return {
    history,
    templates,
    isLoading,
    savePrompt: savePrompt.mutateAsync,
    updateUsage: updateUsage.mutateAsync,
    deletePrompt: deletePrompt.mutateAsync,
    saveAsTemplate: saveAsTemplate.mutateAsync,
  };
};
