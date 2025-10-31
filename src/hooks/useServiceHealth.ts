/**
 * Service Health Monitoring Hook
 * Проверяет статус AI провайдеров (Suno, Mureka)
 */

import { useQuery } from '@tanstack/react-query';
import { checkSunoHealth, checkMurekaHealth, CombinedHealthStatus } from '@/services/monitoring.service';

export const useServiceHealth = () => {
  return useQuery<CombinedHealthStatus>({
    queryKey: ['service-health'],
    queryFn: async () => {
      const [sunoHealth, murekaHealth] = await Promise.all([
        checkSunoHealth(),
        checkMurekaHealth(),
      ]);

      return {
        suno: {
          status: sunoHealth.healthy ? 'operational' : 'down',
          balance: sunoHealth.balance,
          lastChecked: sunoHealth.lastChecked,
        },
        mureka: {
          status: murekaHealth.healthy ? 'operational' : 'down',
          balance: murekaHealth.balance,
          lastChecked: murekaHealth.lastChecked,
        },
      };
    },
    refetchInterval: 60_000, // Каждую минуту
    retry: 3,
    staleTime: 30_000, // 30 секунд
  });
};
