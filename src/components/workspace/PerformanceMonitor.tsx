/**
 * ✅ Phase 6: Performance Monitor Component
 * Dev-only компонент для мониторинга производительности workspace
 */

import { useWorkspacePerformance } from '@/hooks/useWorkspacePerformance';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const PerformanceMonitor = () => {
  const { metrics, isPerformanceOptimal } = useWorkspacePerformance();

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg"
      style={{
        backgroundColor: 'hsl(var(--background))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Performance:</span>
          <Badge
            variant={isPerformanceOptimal ? 'default' : 'destructive'}
            className="font-mono"
          >
            {isPerformanceOptimal ? 'Optimal' : 'Degraded'}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">FPS:</span>
          <span
            className={cn(
              'font-mono',
              metrics.fps >= 55 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {metrics.fps}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Render:</span>
          <span
            className={cn(
              'font-mono',
              metrics.renderTime < 16.67 ? 'text-green-500' : 'text-orange-500'
            )}
          >
            {metrics.renderTime.toFixed(2)}ms
          </span>
        </div>

        {metrics.memoryUsage > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Memory:</span>
            <span
              className={cn(
                'font-mono',
                metrics.memoryUsage < 100 ? 'text-green-500' : 'text-orange-500'
              )}
            >
              {metrics.memoryUsage.toFixed(1)}MB
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
