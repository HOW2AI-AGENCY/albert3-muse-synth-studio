import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SunoPersona {
  id: string;
  user_id: string;
  suno_persona_id: string;
  name: string;
  description: string;
  cover_image_url?: string;
  source_track_id?: string;
  source_suno_task_id?: string;
  source_music_index?: number;
  is_public: boolean;
  usage_count: number;
  last_used_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useSunoPersonas = () => {
  const queryClient = useQueryClient();

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['suno-personas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suno_personas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SunoPersona[];
    },
  });

  const deletePersona = useMutation({
    mutationFn: async (personaId: string) => {
      const { error } = await supabase
        .from('suno_personas')
        .delete()
        .eq('id', personaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suno-personas'] });
      toast.success('Персона удалена');
    },
    onError: (error: Error) => {
      toast.error('Ошибка удаления персоны: ' + error.message);
    },
  });

  const updatePersona = useMutation({
    mutationFn: async ({ 
      personaId, 
      updates 
    }: { 
      personaId: string; 
      updates: Partial<SunoPersona> 
    }) => {
      const { error } = await supabase
        .from('suno_personas')
        .update(updates)
        .eq('id', personaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suno-personas'] });
      toast.success('Персона обновлена');
    },
    onError: (error: Error) => {
      toast.error('Ошибка обновления персоны: ' + error.message);
    },
  });

  return {
    personas,
    isLoading,
    deletePersona: deletePersona.mutate,
    updatePersona: updatePersona.mutate,
    isDeleting: deletePersona.isPending,
    isUpdating: updatePersona.isPending,
  };
};
