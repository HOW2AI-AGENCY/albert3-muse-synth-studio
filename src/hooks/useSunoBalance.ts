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
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30s
  });
};
