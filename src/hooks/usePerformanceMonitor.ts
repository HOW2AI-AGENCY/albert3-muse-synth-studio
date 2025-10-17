/**
 * Performance Monitoring Hook
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 * 
 * Отслеживает производительность критических операций
 */

import { useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceMonitorOptions {
  enabled?: boolean;
  threshold?: number; // Warn if operation takes longer than this (ms)
  onMetric?: (metric: PerformanceMetric) => void;
}

/**
 * Hook для мониторинга производительности операций
 */
export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const { enabled = true, threshold = 1000, onMetric } = options;
  const metricsRef = useRef<PerformanceMetric[]>([]);

  /**
   * Начать отслеживание операции
   */
  const startMeasure = useCallback((name: string) => {
    if (!enabled) return () => {};

    const startTime = performance.now();
    const startMark = `${name}-start-${Date.now()}`;

    if (typeof performance.mark === 'function') {
      performance.mark(startMark);
    }

    /**
     * Завершить отслеживание и записать метрику
     */
    return (metadata?: Record<string, unknown>) => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: Date.now(),
        metadata,
      };

      metricsRef.current.push(metric);

      // Warn if operation is slow
      if (duration > threshold) {
        logger.warn(`Slow operation detected: ${name}`, 'PerformanceMonitor', {
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          ...metadata,
        });
      } else {
        logger.debug(`Operation completed: ${name}`, 'PerformanceMonitor', {
          duration: `${duration.toFixed(2)}ms`,
          ...metadata,
        });
      }

      // Call custom metric handler
      if (onMetric) {
        onMetric(metric);
      }

      // Clean up old metrics (keep last 100)
      if (metricsRef.current.length > 100) {
        metricsRef.current = metricsRef.current.slice(-100);
      }
    };
  }, [enabled, threshold, onMetric]);

  /**
   * Обернуть async функцию с автоматическим измерением
   */
  const measureAsync = useCallback(
    async <T,>(
      name: string,
      fn: () => Promise<T>,
      metadata?: Record<string, unknown>
    ): Promise<T> => {
      if (!enabled) {
        return fn();
      }

      const endMeasure = startMeasure(name);

      try {
        const result = await fn();
        endMeasure({ ...metadata, success: true });
        return result;
      } catch (error) {
        endMeasure({
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    [enabled, startMeasure]
  );

  /**
   * Получить все метрики
   */
  const getMetrics = useCallback(() => {
    return [...metricsRef.current];
  }, []);

  /**
   * Получить статистику по операциям
   */
  const getStats = useCallback(() => {
    const metrics = metricsRef.current;
    
    if (metrics.length === 0) {
      return null;
    }

    const byName = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(byName).map(([name, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b);
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      return {
        name,
        count: durations.length,
        avg: Number(avg.toFixed(2)),
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        p50: Number(p50.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        p99: Number(p99.toFixed(2)),
      };
    });
  }, []);

  /**
   * Очистить все метрики
   */
  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
  }, []);

  // Log stats periodically in development
  useEffect(() => {
    if (!enabled || process.env.NODE_ENV !== 'development') {
      return;
    }

    const interval = setInterval(() => {
      const stats = getStats();
      if (stats && stats.length > 0) {
        logger.info('Performance statistics', 'PerformanceMonitor', { stats });
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [enabled, getStats]);

  return {
    startMeasure,
    measureAsync,
    getMetrics,
    getStats,
    clearMetrics,
  };
}

/**
 * HOC для автоматического измерения производительности компонента
 */
export function withPerformanceMonitoring<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  const PerformanceMonitoredComponent = (props: P) => {
    const { startMeasure } = usePerformanceMonitor();

    useEffect(() => {
      const endMeasure = startMeasure(`${componentName}.render`);
      return () => {
        endMeasure();
      };
    });

    return React.createElement(Component, props);
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  
  return PerformanceMonitoredComponent;
}
