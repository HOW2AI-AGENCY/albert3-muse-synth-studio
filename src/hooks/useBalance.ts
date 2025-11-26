import { useQuery } from '@tanstack/react-query';
import { sunoAdapter } from '@/services/providers/adapters/suno.adapter';
import { QUERY_KEYS } from '@/config/react-query';
import { logger } from '@/utils/logger';

/**
 * @description Hook to fetch user's Suno credits balance.
 * It uses react-query for caching and automatic refetching.
 */
export const useBalance = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.USER_BALANCE],
    queryFn: async () => {
      try {
        const balanceInfo = await sunoAdapter.getBalance();
        return balanceInfo;
      } catch (error) {
        logger.error('Failed to fetch balance:', { error });
        // Re-throw the error so react-query can handle it
        throw error;
      }
    },
    // Optional: Configure staleTime, cacheTime, refetch intervals etc.
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2, // Retry failed requests 2 times
  });
};
