/**
 * Provider Health Indicator Component
 * Отображает статус провайдеров (Suno/Mureka) в header
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from '@/utils/iconImports';

interface ProviderHealthIndicatorProps {
  className?: string;
}

interface HealthStatus {
  ok: boolean;
  provider: string;
  latency?: number;
}

export const ProviderHealthIndicator = ({ className }: ProviderHealthIndicatorProps) => {
  const { data: health, isLoading } = useQuery({
    queryKey: ['provider-health'],
    queryFn: async () => {
      const startTime = Date.now();
      
      // Quick health check через get-balance
      const { data, error } = await supabase.functions.invoke('get-balance', {
        body: { provider: 'suno' }
      });
      
      const latency = Date.now() - startTime;
      
      return {
        ok: !error && data,
        provider: 'suno',
        latency
      } as HealthStatus;
    },
    refetchInterval: 60_000, // Каждую минуту
    retry: 1,
    staleTime: 30_000
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">Проверка...</span>
      </div>
    );
  }

  const statusColor = health?.ok ? 'bg-green-500' : 'bg-red-500';
  const statusText = health?.ok ? 'Operational' : 'Down';
  const latencyText = health?.latency ? `${health.latency}ms` : '';

  return (
    <div 
      className={cn("flex items-center gap-2 text-xs", className)}
      title={`Статус: ${statusText} ${latencyText}`}
    >
      <div className={cn("h-2 w-2 rounded-full", statusColor)} />
      <span className="hidden sm:inline text-muted-foreground">
        {statusText}
      </span>
      {latencyText && (
        <span className="hidden md:inline text-muted-foreground/70">
          {latencyText}
        </span>
      )}
    </div>
  );
};
