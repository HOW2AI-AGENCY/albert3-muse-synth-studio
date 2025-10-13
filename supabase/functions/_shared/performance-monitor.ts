import { logger } from "./logger.ts";

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceThresholds {
  slow: number; // milliseconds
  critical: number; // milliseconds
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slow: 1000, // 1 second
  critical: 3000, // 3 seconds
};

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Start timing an operation
   */
  startTimer(operation: string): (metadata?: Record<string, unknown>) => void {
    const startTime = performance.now();
    const startTimestamp = Date.now();

    return (metadata?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operation,
        duration,
        timestamp: startTimestamp,
        metadata,
      });
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (metric.duration > DEFAULT_THRESHOLDS.slow) {
      const level = metric.duration > DEFAULT_THRESHOLDS.critical ? 'error' : 'warn';
      logger[level]('Slow operation detected', {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        threshold: metric.duration > DEFAULT_THRESHOLDS.critical ? 'critical' : 'slow',
        ...metric.metadata,
      });
    } else {
      logger.debug('Operation completed', {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        ...metric.metadata,
      });
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
  } {
    const filteredMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: filteredMetrics.length,
      avgDuration: sum / filteredMetrics.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    logger.debug('Performance metrics cleared');
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator function to monitor async function performance
 */
export const monitorPerformance = <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> => {
  const endTimer = performanceMonitor.startTimer(operation);
  
  return fn()
    .then(result => {
      endTimer(metadata);
      return result;
    })
    .catch(error => {
      endTimer({ ...metadata, error: true });
      throw error;
    });
};

/**
 * Create performance headers for HTTP responses
 */
export const createPerformanceHeaders = (duration: number) => ({
  'Server-Timing': `total;dur=${duration.toFixed(2)}`,
  'X-Response-Time': `${duration.toFixed(2)}ms`,
});
