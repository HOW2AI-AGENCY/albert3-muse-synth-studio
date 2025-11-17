/**
 * Performance Monitor Widget (Development Only)
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 */

import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, BarChart3, Trash2, X } from 'lucide-react';
export const PerformanceMonitorWidget: React.FC = () => {
  const {
    getStats,
    getMetrics,
    clearMetrics
  } = usePerformanceMonitor();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<ReturnType<typeof getStats>>(null);
  const [metricsCount, setMetricsCount] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setStats(getStats());
      setMetricsCount(getMetrics().length);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, getStats, getMetrics]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  if (!isOpen) {
    return;
  }
  return <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto shadow-xl" style={{
    zIndex: 'var(--z-maximum)'
  }}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <h3 className="font-semibold">Performance Monitor</h3>
            <Badge variant="outline" className="text-xs">
              {metricsCount} metrics
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => clearMetrics()} size="icon" variant="ghost" className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsOpen(false)} size="icon" variant="ghost" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && stats.length > 0 ? <div className="space-y-2">
            {stats.map(stat => <div key={stat.name} className="p-2 border rounded-lg space-y-1 text-xs">
                <div className="font-medium truncate">{stat.name}</div>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <div>
                    Avg: <span className="font-mono">{stat.avg}ms</span>
                  </div>
                  <div>
                    P95: <span className="font-mono">{stat.p95}ms</span>
                  </div>
                  <div>
                    Count: <span className="font-mono">{stat.count}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <div>
                    Min: <span className="font-mono">{stat.min}ms</span>
                  </div>
                  <div>
                    Max: <span className="font-mono">{stat.max}ms</span>
                  </div>
                  <div>
                    P99: <span className="font-mono">{stat.p99}ms</span>
                  </div>
                </div>
              </div>)}
          </div> : <div className="text-center py-8 text-muted-foreground text-sm">
            No performance metrics yet.
            <br />
            Metrics will appear as you use the app.
          </div>}
      </div>
    </Card>;
};