import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { startOfDay, subDays } from 'date-fns';

type PromptProvider = 'suno' | 'mureka';

export interface PromptHistoryItem {
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
  result_track_id?: string;
  generation_status?: string;
  generation_time_ms?: number;
  model_version?: string;
}

export interface PromptFilters {
  dateRange?: 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days';
  provider?: 'all' | 'suno' | 'mureka';
  status?: 'all' | 'success' | 'failed' | 'pending';
  searchQuery?: string;
}

export const usePromptHistory = (filters?: PromptFilters) => {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['prompt-history', filters],
    queryFn: async () => {
      let query = supabase.from('prompt_history').select('*').order('last_used_at', { ascending: false });

      if (filters?.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        if (filters.dateRange === 'today') {
          query = query.gte('created_at', startOfDay(now).toISOString());
        } else if (filters.dateRange === 'yesterday') {
          query = query.gte('created_at', startOfDay(subDays(now, 1)).toISOString()).lt('created_at', startOfDay(now).toISOString());
        } else if (filters.dateRange === 'last7days') {
          query = query.gte('created_at', subDays(now, 7).toISOString());
        } else if (filters.dateRange === 'last30days') {
          query = query.gte('created_at', subDays(now, 30).toISOString());
        }
      }

      if (filters?.provider && filters.provider !== 'all') query = query.eq('provider', filters.provider);
      if (filters?.status && filters.status !== 'all') query = query.eq('generation_status', filters.status);
      if (filters?.searchQuery) query = query.ilike('prompt', `%${filters.searchQuery}%`);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as PromptHistoryItem[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prompt_history').select('*').eq('is_template', true).order('template_name');
      if (error) throw error;
      return data as PromptHistoryItem[];
    },
  });

  const savePrompt = useMutation({
    mutationFn: async (params: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('prompt_history').insert({ user_id: user.id, ...params }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompt-history'] }),
  });

  const linkPromptToTrack = useMutation({
    mutationFn: async ({ promptId, trackId, generationTimeMs }: any) => {
      const { error } = await supabase.from('prompt_history').update({ result_track_id: trackId, generation_status: 'success', generation_time_ms: generationTimeMs }).eq('id', promptId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompt-history'] }),
  });

  const markPromptFailed = useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase.from('prompt_history').update({ generation_status: 'failed' }).eq('id', promptId);
      if (error) throw error;
    },
  });

  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prompt_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-history'] });
      toast({ description: 'Промпт удален' });
    },
  });

  const exportHistory = async (format: 'json' | 'csv') => {
    const { data } = await supabase.from('prompt_history').select('*').order('created_at', { ascending: false });
    const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : 'CSV'], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-history-${new Date().toISOString()}.${format}`;
    a.click();
  };

  return { history, templates, isLoading, savePrompt, linkPromptToTrack, markPromptFailed, deletePrompt, exportHistory };
};
