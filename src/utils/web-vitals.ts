/**
 * Web Vitals performance monitoring
 * Tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB
 */

import { onCLS, onFID, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from '@/utils/logger';

type MetricCallback = (metric: Metric) => void;

/**
 * Performance thresholds (ms)
 */
export const PERFORMANCE_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800 },
} as const;

/**
 * Log metric to console in development
 */
export const logMetric = (metric: Metric) => {
  if (import.meta.env.DEV) {
    const rating = getMetricRating(metric.name, metric.value);
    logger.info(
      `[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${rating})`,
      'WebVitals',
      { metric: metric.name, value: metric.value, rating, delta: metric.delta }
    );
  }
};

/**
 * Get metric rating based on thresholds
 */
export const getMetricRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
};

/**
 * Report Web Vitals metrics
 */
export const reportWebVitals = (onPerfEntry?: MetricCallback) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onLCP(onPerfEntry);
    onFCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};
