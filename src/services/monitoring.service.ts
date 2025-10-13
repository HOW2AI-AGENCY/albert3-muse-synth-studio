/**
 * Production Monitoring Service
 * Отслеживание Web Vitals, ошибок, производительности
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

// Типы метрик
export type MetricName = 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

export interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  url: string;
  timestamp: number;
}

// Пороги для оценки метрик
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

// Оценка метрики
function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Отправка метрики в Sentry
function reportToSentry(metric: Metric) {
  const metricData: WebVitalMetric = {
    name: metric.name as MetricName,
    value: metric.value,
    rating: getRating(metric.name as MetricName, metric.value),
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
  };

  // Sentry span
  Sentry.startSpan(
    { 
      name: `web-vital.${metric.name}`,
      op: 'measure',
      attributes: {
        value: metric.value,
        rating: metricData.rating,
        navigationType: metric.navigationType,
      }
    },
    () => {}
  );

  logger.info(`Web Vital: ${metric.name}`, 'MonitoringService', metricData as unknown as Record<string, unknown>);
}

// Отправка метрики в Supabase (для analytics) - DISABLED
// Таблица web_vitals_events не существует в схеме
async function reportToDatabase(_metric: WebVitalMetric) {
  // Будет реализовано позже при создании таблицы
  return Promise.resolve();
}

// Инициализация Web Vitals мониторинга
export function initWebVitals() {
  const handleMetric = (metric: Metric) => {
    reportToSentry(metric);
    
    // Отправляем в БД только если метрика "poor"
    const rating = getRating(metric.name as MetricName, metric.value);
    if (rating === 'poor') {
      const metricData: WebVitalMetric = {
        name: metric.name as MetricName,
        value: metric.value,
        rating,
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now(),
      };
      void reportToDatabase(metricData);
    }
  };

  onCLS(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);
}

// Мониторинг API health
export interface ServiceHealthStatus {
  suno: {
    status: 'operational' | 'degraded' | 'down';
    balance?: number;
    lastChecked: number;
  };
  mureka: {
    status: 'operational' | 'degraded' | 'down';
    balance?: number;
    lastChecked: number;
  };
}

export async function checkSunoHealth(): Promise<{ ok: boolean; balance?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('get-balance', {
      body: { provider: 'suno' },
    });

    if (error) throw error;
    return { ok: true, balance: data?.balance };
  } catch (error) {
    logger.error('Suno health check failed', error as Error, 'MonitoringService');
    return { ok: false };
  }
}

export async function checkMurekaHealth(): Promise<{ ok: boolean; balance?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mureka-balance');

    if (error) throw error;
    return { ok: true, balance: data?.balance };
  } catch (error) {
    logger.error('Mureka health check failed', error as Error, 'MonitoringService');
    return { ok: false };
  }
}

// Мониторинг производительности генерации
export interface GenerationMetrics {
  trackId: string;
  provider: 'suno' | 'mureka';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
}

const generationMetrics = new Map<string, GenerationMetrics>();

export function startGenerationTracking(trackId: string, provider: 'suno' | 'mureka') {
  generationMetrics.set(trackId, {
    trackId,
    provider,
    startTime: Date.now(),
    status: 'pending',
  });
}

export function endGenerationTracking(
  trackId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
) {
  const metric = generationMetrics.get(trackId);
  if (!metric) return;

  metric.endTime = Date.now();
  metric.duration = metric.endTime - metric.startTime;
  metric.status = status;
  metric.errorMessage = errorMessage;

  // Отправляем в Sentry
  Sentry.startSpan(
    {
      name: 'generation.duration',
      op: 'measure',
      attributes: {
        duration: metric.duration,
        provider: metric.provider,
        status,
      }
    },
    () => {}
  );

  logger.info('Generation completed', 'MonitoringService', metric as unknown as Record<string, unknown>);

  generationMetrics.delete(trackId);
}
