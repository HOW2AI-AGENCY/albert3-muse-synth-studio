/**
 * Hook for fetching Mureka AI API balance
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MurekaBalanceResponse {
  balance: number;
  currency: string;
  details?: any;
}

export const useMurekaBalance = () => {
  return useQuery({
    queryKey: ['mureka-balance'],
    queryFn: async () => {
      logger.info('Fetching Mureka balance');

      const { data, error } = await supabase.functions.invoke<MurekaBalanceResponse>(
        'get-mureka-balance'
      );

      if (error) {
        logger.error('Failed to fetch Mureka balance', error instanceof Error ? error : new Error(String(error)));
        throw new Error(error.message || 'Failed to fetch balance');
      }

      logger.info('Mureka balance retrieved', undefined, {
        balance: data?.balance,
        currency: data?.currency,
      });

      return data || { balance: 0, currency: 'CNY' };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};
