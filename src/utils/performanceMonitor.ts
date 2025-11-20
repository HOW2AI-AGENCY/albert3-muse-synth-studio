/**
 * Performance Monitor - Мониторинг производительности приложения
 * Отслеживает метрики и потенциальные проблемы производительности
 */

import { logger } from '@/utils/logger';

interface PerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceThresholds {
  generation: number; // время генерации (мс)
  apiCall: number; // время API вызова (мс)
  rendering: number; // время рендеринга (мс)
  audioLoad: number; // время загрузки аудио (мс)
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 500;
  private timers = new Map<string, number>();
  
  private thresholds: PerformanceThresholds = {
    generation: 90000, // 90 секунд
    apiCall: 10000, // 10 секунд
    rendering: 1000, // 1 секунда
    audioLoad: 5000, // 5 секунд
  };

  /**
   * Начать измерение времени операции
   */
  startTimer(id: string, context?: string): void {
    this.timers.set(id, performance.now());
    logger.debug(`⏱️ Timer started: ${id}`, context || 'PerformanceMonitor');
  }

  /**
   * Завершить измерение и записать метрику
   */
  endTimer(
    id: string, 
    metricName: string, 
    context?: string,
    metadata?: Record<string, unknown>
  ): number | null {
    const startTime = this.timers.get(id);
    
    if (!startTime) {
      logger.warn(`Timer not found: ${id}`, 'PerformanceMonitor');
      return null;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(id);

    this.recordMetric(metricName, duration, context, metadata);

    // Проверка порогов
    this.checkThreshold(metricName, duration, context, metadata);

    return duration;
  }

  /**
   * Записать метрику вручную
   */
  recordMetric(
    name: string,
    value: number,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context,
      metadata,
    };

    this.metrics.push(metric);

    // Ограничение размера
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    logger.debug(`📊 Metric recorded: ${name} = ${value.toFixed(2)}ms`, context || 'PerformanceMonitor', metadata);
  }

  /**
   * Проверка превышения порогов
   */
  private checkThreshold(
    name: string,
    value: number,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    const threshold = this.getThreshold(name);
    
    if (threshold && value > threshold) {
      logger.warn(
        `⚠️ Performance threshold exceeded for ${name}`,
        'PerformanceMonitor',
        {
          metric: name,
          value: `${value.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          excess: `${(value - threshold).toFixed(2)}ms`,
          context,
          ...metadata,
        }
      );
    }
  }

  /**
   * Получить порог для метрики
   */
  private getThreshold(metricName: string): number | null {
    if (metricName.includes('generation')) return this.thresholds.generation;
    if (metricName.includes('api') || metricName.includes('request')) return this.thresholds.apiCall;
    if (metricName.includes('render')) return this.thresholds.rendering;
    if (metricName.includes('audio') || metricName.includes('load')) return this.thresholds.audioLoad;
    return null;
  }

  /**
   * Получить метрики
   */
  getMetrics(filter?: { name?: string; context?: string; since?: number }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filter?.name) {
      filtered = filtered.filter(m => m.name.includes(filter.name!));
    }

    if (filter?.context) {
      filtered = filtered.filter(m => m.context?.includes(filter.context!));
    }

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!);
    }

    return filtered;
  }

  /**
   * Статистика по метрике
   */
  getStats(metricName: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics({ name: metricName });
    
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);

    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * values.length) - 1;
      return values[index] || 0;
    };

    return {
      count: values.length,
      avg: sum / values.length,
      min: values[0] || 0,
      max: values[values.length - 1] || 0,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  /**
   * Очистить метрики
   */
  clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
    logger.info('Performance metrics cleared', 'PerformanceMonitor');
  }

  /**
   * Экспорт метрик
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      stats: {
        generation: this.getStats('generation'),
        apiCall: this.getStats('api'),
        rendering: this.getStats('render'),
        audioLoad: this.getStats('audio'),
      },
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Мониторинг Web Vitals
   */
  monitorWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Измеряем Navigation Timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationTiming) {
        this.recordMetric('page.domContentLoaded', navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart);
        this.recordMetric('page.loadComplete', navigationTiming.loadEventEnd - navigationTiming.fetchStart);
        this.recordMetric('page.domInteractive', navigationTiming.domInteractive - navigationTiming.fetchStart);
      }
    }

    // Слушаем Paint Timing
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric(`paint.${entry.name}`, entry.startTime);
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // Слушаем Long Tasks (> 50ms)
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            logger.warn('⚠️ Long task detected', 'PerformanceMonitor', {
              duration: `${entry.duration.toFixed(2)}ms`,
              startTime: entry.startTime,
            });
            this.recordMetric('task.long', entry.duration);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        logger.debug('PerformanceObserver not fully supported', 'PerformanceMonitor');
      }
    }
  }

  /**
   * Мониторинг памяти (если доступно)
   */
  monitorMemory(): void {
    if (typeof window === 'undefined') return;

    const perf = window.performance as Performance & { memory?: PerformanceMemory };
    if (perf?.memory) {
      const memoryInfo = perf.memory;
      
      this.recordMetric('memory.used', memoryInfo.usedJSHeapSize / 1048576, 'PerformanceMonitor', {
        unit: 'MB',
      });
      
      this.recordMetric('memory.total', memoryInfo.totalJSHeapSize / 1048576, 'PerformanceMonitor', {
        unit: 'MB',
      });

      const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 90) {
        logger.warn('⚠️ High memory usage detected', 'PerformanceMonitor', {
          used: `${(memoryInfo.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memoryInfo.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
          percent: `${usagePercent.toFixed(2)}%`,
        });
      }
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Автоматический мониторинг Web Vitals при загрузке
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    performanceMonitor.monitorWebVitals();
  });

  // Периодический мониторинг памяти
  setInterval(() => {
    performanceMonitor.monitorMemory();
  }, 60000); // каждую минуту
}

// Удобные функции
export const startPerformanceTimer = (id: string, context?: string) => 
  performanceMonitor.startTimer(id, context);

export const endPerformanceTimer = (id: string, metricName: string, context?: string, metadata?: Record<string, unknown>) => 
  performanceMonitor.endTimer(id, metricName, context, metadata);

export const recordPerformanceMetric = (name: string, value: number, context?: string, metadata?: Record<string, unknown>) => 
  performanceMonitor.recordMetric(name, value, context, metadata);
