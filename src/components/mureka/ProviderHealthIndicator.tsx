/**
 * ProviderHealthIndicator - Индикатор состояния провайдера
 * Phase 5: Health Check UI для провайдеров
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MusicProvider } from '@/services/providers/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ProviderHealthIndicatorProps {
  provider: MusicProvider;
  className?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}

export const ProviderHealthIndicator = ({ provider, className }: ProviderHealthIndicatorProps) => {
  const { data: health, isLoading } = useQuery<HealthStatus>({
    queryKey: ['provider-health', provider],
    queryFn: async () => {
      const startTime = Date.now();
      
      try {
        // Проверяем доступность через get-balance
        const { data, error } = await supabase.functions.invoke('get-balance', {
          body: { provider }
        });
        
        const latency = Date.now() - startTime;
        
        if (error || !data) {
          return {
            status: 'down' as const,
            latency,
            message: 'Недоступен'
          };
        }
        
        // Если latency > 5s - degraded
        if (latency > 5000) {
          return {
            status: 'degraded' as const,
            latency,
            message: 'Медленный ответ'
          };
        }
        
        return {
          status: 'healthy' as const,
          latency,
          message: 'Доступен'
        };
      } catch (err) {
        return {
          status: 'down' as const,
          message: 'Ошибка соединения'
        };
      }
    },
    refetchInterval: 60000, // Проверять каждую минуту
    staleTime: 45000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Loader2 className="h-2 w-2 text-muted-foreground animate-spin" />
        <span className="text-xs text-muted-foreground">Проверка...</span>
      </div>
    );
  }

  const statusConfig = {
    healthy: {
      color: 'bg-green-500',
      text: 'text-green-600',
      label: health?.message || 'Доступен'
    },
    degraded: {
      color: 'bg-yellow-500',
      text: 'text-yellow-600',
      label: health?.message || 'Замедлен'
    },
    down: {
      color: 'bg-red-500',
      text: 'text-red-600',
      label: health?.message || 'Недоступен'
    }
  };

  const config = statusConfig[health?.status || 'down'];

  return (
    <div 
      className={cn("flex items-center gap-1.5", className)}
      title={`Статус: ${config.label}${health?.latency ? ` (${health.latency}ms)` : ''}`}
    >
      <div className={cn(
        "h-2 w-2 rounded-full animate-pulse",
        config.color
      )} />
      <span className={cn("text-xs font-medium", config.text)}>
        {config.label}
      </span>
    </div>
  );
};
