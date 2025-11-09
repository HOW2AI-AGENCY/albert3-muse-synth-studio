/**
 * KPI Monitoring Module
 * Сбор ключевых показателей эффективности: скорость обработки, латентность API,
 * использование памяти, частота ошибок. Предоставляет агрегированные метрики и экспорт.
 */

import { recordPerformanceMetric } from './performanceMonitor';
import { logger } from './logger';

type KPIName = 'data_processing' | 'api_latency' | 'memory_used' | 'error_rate';

interface KpiSample {
  name: KPIName;
  value: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}

class KpiStore {
  private timers = new Map<string, number>();
  private samples: KpiSample[] = [];
  private max = 1000;

  start(id: string): void {
    this.timers.set(id, performance.now());
  }

  end(id: string, name: KPIName, meta?: Record<string, unknown>): number | null {
    const start = this.timers.get(id);
    if (!start) return null;
    const dur = performance.now() - start;
    this.timers.delete(id);
    this.push({ name, value: dur, timestamp: Date.now(), meta });
    // Дублируем в общий PerformanceMonitor
    recordPerformanceMetric(name === 'api_latency' ? 'apiCall' : name === 'data_processing' ? 'generation' : name, dur, 'KPI', meta);
    return dur;
  }

  push(sample: KpiSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.max) this.samples = this.samples.slice(-this.max);
  }

  aggregate(): Record<KPIName, { count: number; avg: number; p95: number; max: number }> {
    const buckets: Record<KPIName, number[]> = {
      data_processing: [],
      api_latency: [],
      memory_used: [],
      error_rate: [],
    } as const as Record<KPIName, number[]>;

    for (const s of this.samples) {
      buckets[s.name].push(s.value);
    }

    const toStats = (values: number[]) => {
      if (values.length === 0) return { count: 0, avg: 0, p95: 0, max: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const avg = sum / count;
      const p95 = sorted[Math.floor(count * 0.95) - 1] ?? sorted[sorted.length - 1];
      const max = sorted[sorted.length - 1];
      return { count, avg, p95, max };
    };

    return {
      data_processing: toStats(buckets.data_processing),
      api_latency: toStats(buckets.api_latency),
      memory_used: toStats(buckets.memory_used),
      error_rate: toStats(buckets.error_rate),
    };
  }

  snapshot() {
    const stats = this.aggregate();
    try {
      localStorage.setItem('kpi:snapshot', JSON.stringify(stats));
    } catch {
      // ignore localStorage errors silently
    }
    return stats;
  }

  exportJSON(): string {
    return JSON.stringify({ samples: this.samples, stats: this.aggregate() }, null, 2);
  }

  clear(): void {
    this.samples = [];
    this.timers.clear();
  }

  logSummary(): void {
    const s = this.aggregate();
    logger.info('KPI summary', 'KPI', s as unknown as Record<string, unknown>);
  }
}

export const kpi = new KpiStore();

// Удобные alias-методы
export const startKpiTimer = (id: string) => kpi.start(id);
export const endKpiTimer = (id: string, name: KPIName, meta?: Record<string, unknown>) => kpi.end(id, name, meta);
export const recordKpi = (name: KPIName, value: number, meta?: Record<string, unknown>) => kpi.push({ name, value, timestamp: Date.now(), meta });
export const getKpiSnapshot = () => kpi.snapshot();
export const clearKpi = () => kpi.clear();
export const exportKpiJSON = () => kpi.exportJSON();