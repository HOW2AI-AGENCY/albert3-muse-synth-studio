/**
 * Create Suno Persona Hook
 * Sprint 33.1: Persona Creation System
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface CreatePersonaParams {
  trackId: string;
  musicIndex?: number;
  name: string;
  description: string;
  isPublic?: boolean;
}

export const useCreatePersona = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CreatePersonaParams) => {
      const { trackId, musicIndex = 0, name, description, isPublic = false } = params;

      logger.info('Creating Suno persona', 'useCreatePersona', { trackId, name });

      const { data, error } = await supabase.functions.invoke('create-suno-persona', {
        body: {
          trackId,
          musicIndex,
          name,
          description,
          isPublic
        }
      });

      if (error) {
        logger.error('Failed to create persona', error, 'useCreatePersona');
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('🎤 Персона создана!', {
        description: `"${data.name}" готова к использованию`
      });
      
      queryClient.invalidateQueries({ queryKey: ['suno-personas'] });
      logger.info('Persona created successfully', 'useCreatePersona', { personaId: data.id });
    },
    onError: (error: Error) => {
      if (error.message.includes('already exists')) {
        toast.error('Персона уже существует', {
          description: 'Эта комбинация трека и индекса уже использована'
        });
      } else if (error.message.includes('insufficient credits')) {
        toast.error('Недостаточно кредитов', {
          description: 'Пополните баланс для создания персоны'
        });
      } else {
        toast.error('Ошибка создания персоны', {
          description: error.message
        });
      }
      logger.error('Create persona error', error, 'useCreatePersona');
    }
  });

  return {
    createPersona: mutation.mutate,
    createPersonaAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error
  };
};
