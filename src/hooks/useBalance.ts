/**
 * Hook для получения баланса кредитов пользователя
 * Использует TanStack Query для кэширования и автоматического обновления
 * 
 * @version 2.1.0
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface BalanceInfo {
  credits_remaining: number;
  credits_used_today: number;
  daily_limit: number;
  subscription_tier: string;
}

/**
 * @description Hook для получения баланса кредитов через backend
 * Кэширует результат на 5 минут для оптимизации производительности
 */
export const useBalance = () => {
  return useQuery({
    queryKey: ['user-balance'],
    queryFn: async (): Promise<BalanceInfo> => {
      try {
        // Получаем текущего пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('User not authenticated');
        }

        // Получаем профиль с балансом
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('credits_remaining, credits_used_today, subscription_tier')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        return {
          credits_remaining: profile?.credits_remaining || 0,
          credits_used_today: profile?.credits_used_today || 0,
          daily_limit: 100, // Default daily limit
          subscription_tier: profile?.subscription_tier || 'free',
        };
      } catch (error) {
        logger.error('Failed to fetch balance', error as Error, 'useBalance');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут (gcTime заменяет устаревший cacheTime)
    retry: 2,
  });
};
