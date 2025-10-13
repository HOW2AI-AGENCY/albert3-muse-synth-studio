/**
 * Service Health Monitoring Hook
 * Проверяет статус AI провайдеров (Suno, Mureka)
 */

import { useQuery } from '@tanstack/react-query';
import { checkSunoHealth, checkMurekaHealth, ServiceHealthStatus } from '@/services/monitoring.service';

export const useServiceHealth = () => {
  return useQuery<ServiceHealthStatus>({
    queryKey: ['service-health'],
    queryFn: async () => {
      const [sunoHealth, murekaHealth] = await Promise.all([
        checkSunoHealth(),
        checkMurekaHealth(),
      ]);

      return {
        suno: {
          status: sunoHealth.ok ? 'operational' : 'down',
          balance: sunoHealth.balance,
          lastChecked: Date.now(),
        },
        mureka: {
          status: murekaHealth.ok ? 'operational' : 'down',
          balance: murekaHealth.balance,
          lastChecked: Date.now(),
        },
      };
    },
    refetchInterval: 60_000, // Каждую минуту
    retry: 3,
    staleTime: 30_000, // 30 секунд
  });
};
