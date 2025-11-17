import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SunoBalance {
  balance: number;
  currency: string;
}

export const useSunoBalance = () => {
  return useQuery({
    queryKey: ['suno-balance'],
    queryFn: async (): Promise<SunoBalance> => {
      const { data, error } = await supabase.functions.invoke('get-provider-balance', {
        body: { provider: 'suno' }
      });

      if (error) throw error;
      if (!data?.balance && data?.balance !== 0) {
        throw new Error('Invalid balance response');
      }

      return {
        balance: data.balance,
        currency: data.currency || 'credits'
      };
    },
    refetchInterval: 5 * 60 * 1000, // Обновлять каждые 5 минут
    staleTime: 2 * 60 * 1000, // Считать устаревшим через 2 минуты
    gcTime: 10 * 60 * 1000, // Хранить в кэше 10 минут
    retry: 2, // Повторить 2 раза при ошибке
    retryDelay: 1000, // Задержка между попытками 1 секунда
  });
};
