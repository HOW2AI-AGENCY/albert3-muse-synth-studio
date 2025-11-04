/**
 * Production Monitoring Service
 * Tracks Web Vitals, API health, and generation performance
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

type MetricName = 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals() {
  if (import.meta.env.PROD) {
    const reportMetric = (metric: WebVitalMetric) => {
      // Send to Sentry
      Sentry.metrics.distribution(metric.name, metric.value, {
        unit: 'millisecond',
      });

      // Optionally send to database for poor metrics
      if (metric.rating === 'poor') {
        logger.warn(`Poor ${metric.name} detected`, 'WebVitals', {
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
        });
      }
    };

    onCLS((metric) => reportMetric({
      name: 'CLS',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    }));

    onFCP((metric) => reportMetric({
      name: 'FCP',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    }));

    onLCP((metric) => reportMetric({
      name: 'LCP',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    }));

    onTTFB((metric) => reportMetric({
      name: 'TTFB',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    }));

    onINP((metric) => reportMetric({
      name: 'INP',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    }));
  }
}

/**
 * Service Health Status
 */
export interface ServiceHealthStatus {
  provider: 'suno' | 'mureka';
  healthy: boolean;
  balance?: {
    credits: number;
    limit: number;
  };
  lastChecked: number;
}

/**
 * Combined Health Status for all providers
 */
export interface CombinedHealthStatus {
  suno: {
    status: 'operational' | 'degraded' | 'down';
    balance?: { credits: number; limit: number };
    lastChecked: number;
  };
  mureka: {
    status: 'operational' | 'degraded' | 'down';
    balance?: { credits: number; limit: number };
    lastChecked: number;
  };
}

/**
 * Check Suno API health and balance
 */
export async function checkSunoHealth(): Promise<ServiceHealthStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('get-balance', {
      body: { provider: 'suno' }
    });

    if (error) throw error;

    return {
      provider: 'suno',
      healthy: true,
      balance: data?.balance,
      lastChecked: Date.now(),
    };
  } catch (error) {
    logger.error('Suno health check failed', error instanceof Error ? error : undefined, 'MonitoringService');
    return {
      provider: 'suno',
      healthy: false,
      lastChecked: Date.now(),
    };
  }
}

/**
 * Check Mureka API health and balance
 */
export async function checkMurekaHealth(): Promise<ServiceHealthStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mureka-balance');

    if (error) throw error;

    return {
      provider: 'mureka',
      healthy: true,
      balance: data?.balance,
      lastChecked: Date.now(),
    };
  } catch (error) {
    logger.error('Mureka health check failed', error instanceof Error ? error : undefined, 'MonitoringService');
    return {
      provider: 'mureka',
      healthy: false,
      lastChecked: Date.now(),
    };
  }
}

/**
 * Generation Performance Tracking (unused, kept for future use)
 */
const activeGenerations = new Map<string, number>();

/**
 * Start tracking a generation
 */
export function startGenerationTracking(trackId: string, _provider: 'suno' | 'mureka') {
  activeGenerations.set(trackId, Date.now());
}

/**
 * End tracking and report metrics
 */
export function endGenerationTracking(
  trackId: string, 
  status: 'completed' | 'failed',
  errorMessage?: string
) {
  const startTime = activeGenerations.get(trackId);
  if (!startTime) return;

  const duration = Date.now() - startTime;

  // Send to Sentry
  if (import.meta.env.PROD) {
    Sentry.metrics.distribution('generation.duration', duration, {
      unit: 'millisecond',
    });

    if (status === 'failed' && errorMessage) {
      Sentry.captureMessage(`Generation failed: ${errorMessage}`, {
        level: 'error',
        tags: { trackId },
      });
    }
  }

  activeGenerations.delete(trackId);
}
