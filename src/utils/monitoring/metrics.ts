/**
 * Production Metrics Collection for Monitoring Dashboard
 */

export interface GenerationMetric {
  trackId: string;
  provider: 'suno' | 'mureka';
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  errorCode?: string;
  timestamp: number;
}

export interface ArchivingMetric {
  trackId: string;
  status: 'started' | 'completed' | 'failed';
  filesArchived: number;
  duration?: number;
  timestamp: number;
}

export interface RateLimitMetric {
  provider: 'suno' | 'mureka' | 'lovable-ai';
  endpoint: string;
  retryAfter?: number;
  timestamp: number;
}

class MetricsCollector {
  private generationMetrics: GenerationMetric[] = [];
  private archivingMetrics: ArchivingMetric[] = [];
  private rateLimitMetrics: RateLimitMetric[] = [];
  private readonly maxStoredMetrics = 1000;

  trackGeneration(metric: GenerationMetric) {
    this.generationMetrics.push(metric);
    this.cleanup(this.generationMetrics);
    this.sendToMonitoring('generation', metric);
  }

  trackArchiving(metric: ArchivingMetric) {
    this.archivingMetrics.push(metric);
    this.cleanup(this.archivingMetrics);
    this.sendToMonitoring('archiving', metric);
  }

  trackRateLimit(metric: RateLimitMetric) {
    this.rateLimitMetrics.push(metric);
    this.cleanup(this.rateLimitMetrics);
    this.sendToMonitoring('rate_limit', metric);
  }

  getGenerationStats(timeWindow: number = 3600000) {
    const now = Date.now();
    const recent = this.generationMetrics.filter(m => now - m.timestamp < timeWindow);
    
    return {
      total: recent.length,
      completed: recent.filter(m => m.status === 'completed').length,
      failed: recent.filter(m => m.status === 'failed').length,
      avgDuration: this.calculateAvgDuration(recent),
      successRate: this.calculateSuccessRate(recent),
      byProvider: this.groupByProvider(recent),
    };
  }

  getArchivingStats(timeWindow: number = 86400000) {
    const now = Date.now();
    const recent = this.archivingMetrics.filter(m => now - m.timestamp < timeWindow);
    
    return {
      total: recent.length,
      completed: recent.filter(m => m.status === 'completed').length,
      failed: recent.filter(m => m.status === 'failed').length,
      totalFilesArchived: recent.reduce((sum, m) => sum + (m.filesArchived || 0), 0),
    };
  }

  getRateLimitStats(timeWindow: number = 3600000) {
    const now = Date.now();
    const recent = this.rateLimitMetrics.filter(m => now - m.timestamp < timeWindow);
    
    return {
      total: recent.length,
      byProvider: recent.reduce((acc, m) => {
        acc[m.provider] = (acc[m.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private cleanup<T extends { timestamp: number }>(metrics: T[]) {
    if (metrics.length > this.maxStoredMetrics) {
      metrics.splice(0, metrics.length - this.maxStoredMetrics);
    }
  }

  private calculateAvgDuration(metrics: GenerationMetric[]): number {
    const completed = metrics.filter(m => m.status === 'completed' && m.duration);
    if (completed.length === 0) return 0;
    return completed.reduce((sum, m) => sum + (m.duration || 0), 0) / completed.length;
  }

  private calculateSuccessRate(metrics: GenerationMetric[]): number {
    if (metrics.length === 0) return 0;
    const completed = metrics.filter(m => m.status === 'completed').length;
    return (completed / metrics.length) * 100;
  }

  private groupByProvider(metrics: GenerationMetric[]) {
    return metrics.reduce((acc, m) => {
      if (!acc[m.provider]) {
        acc[m.provider] = { total: 0, completed: 0, failed: 0 };
      }
      acc[m.provider].total++;
      if (m.status === 'completed') acc[m.provider].completed++;
      if (m.status === 'failed') acc[m.provider].failed++;
      return acc;
    }, {} as Record<string, { total: number; completed: number; failed: number }>);
  }

  private sendToMonitoring(type: string, metric: unknown) {
    // Send to Sentry or other monitoring service
    if (import.meta.env.PROD) {
      try {
        // Could integrate with Sentry, Grafana, or custom endpoint
        console.log(`[Metrics] ${type}:`, metric);
      } catch (error) {
        console.error('Failed to send metric:', error);
      }
    }
  }
}

export const metricsCollector = new MetricsCollector();
