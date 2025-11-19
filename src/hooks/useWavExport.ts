/**
 * WAV Export Hook
 * Sprint 33.3: WAV Export
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useWavExport = () => {
  const queryClient = useQueryClient();

  const exportMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data, error } = await SupabaseFunctions.invoke('export-wav', {
        body: { trackId }
      });

      if (error) {
        logger.error('WAV export failed', error, 'useWavExport');
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('🎵 Экспорт WAV начался', {
        description: 'Файл будет готов через несколько минут'
      });
      
      queryClient.invalidateQueries({ queryKey: ['wav-jobs'] });
    },
    onError: (error: Error) => {
      toast.error('Ошибка экспорта', {
        description: error.message
      });
    }
  });

  return {
    exportWav: exportMutation.mutate,
    exportWavAsync: exportMutation.mutateAsync,
    isExporting: exportMutation.isPending
  };
};

export const useWavJobs = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['wav-jobs', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('wav_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });
};
