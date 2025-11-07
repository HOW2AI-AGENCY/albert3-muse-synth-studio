/**
 * Hook для работы с логами генерации текстов песен
 * SPRINT 31: Система логирования генераций
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';


type LyricsLogRow = Database['public']['Tables']['lyrics_generation_log']['Row'];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LyricsGenerationLogEntry extends LyricsLogRow {
  // Можно добавить дополнительные вычисляемые поля если нужно
}

/**
 * Получает все логи генерации текстов для текущего пользователя
 */
export function useLyricsGenerationLog() {
  return useQuery({
    queryKey: ['lyrics-generation-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lyrics_generation_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logError('Failed to fetch lyrics generation log', error, 'useLyricsGenerationLog');
        throw error;
      }

      return data as LyricsGenerationLogEntry[];
    },
  });
}

/**
 * Получает логи с фильтрацией по статусу
 */
export function useLyricsGenerationLogByStatus(status: 'pending' | 'completed' | 'failed') {
  return useQuery({
    queryKey: ['lyrics-generation-log', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lyrics_generation_log')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        logError('Failed to fetch lyrics generation log by status', error, 'useLyricsGenerationLogByStatus', { status });
        throw error;
      }

      return data as LyricsGenerationLogEntry[];
    },
  });
}

/**
 * Получает статистику по логам генерации
 */
export function useLyricsGenerationStats() {
  return useQuery({
    queryKey: ['lyrics-generation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lyrics_generation_log')
        .select('status');

      if (error) {
        logError('Failed to fetch lyrics generation stats', error, 'useLyricsGenerationStats');
        throw error;
      }

      const total = data.length;
      const completed = data.filter(item => item.status === 'completed').length;
      const failed = data.filter(item => item.status === 'failed').length;
      const pending = data.filter(item => item.status === 'pending').length;

      return {
        total,
        completed,
        failed,
        pending,
        successRate: total > 0 ? (completed / total) * 100 : 0,
      };
    },
  });
}
