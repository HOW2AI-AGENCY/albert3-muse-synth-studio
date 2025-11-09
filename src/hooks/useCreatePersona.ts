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
        // Расширяем логирование: статус/контекст ошибки из Supabase Functions
        const status = (error as any)?.status;
        const context = (error as any)?.context;
        logger.error('Failed to create persona', new Error(`${error.message}${status ? ` (status ${status})` : ''}`), 'useCreatePersona');
        if (context) {
          logger.warn('Persona creation error context', 'useCreatePersona', context);
        }
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
      const status = (error as any)?.status as number | undefined;
      const msg = error.message.toLowerCase();
      if (msg.includes('already exists') || status === 409) {
        toast.error('Персона уже существует', {
          description: 'Эта комбинация трека и индекса уже использована'
        });
      } else if (msg.includes('insufficient') || status === 402) {
        toast.error('Недостаточно кредитов', {
          description: 'Пополните баланс для создания персоны'
        });
      } else if (status === 401 || msg.includes('unauthorized') || msg.includes('authorization')) {
        toast.error('Авторизация требуется', {
          description: 'Войдите в аккаунт и повторите попытку'
        });
      } else if (status === 404) {
        toast.error('Трек не найден', {
          description: 'Проверьте корректность выбранного трека'
        });
      } else if (status === 400) {
        toast.error('Некорректные данные', {
          description: 'Проверьте поля формы: название, описание, индекс'
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
