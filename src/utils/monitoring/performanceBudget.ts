/**
 * Performance Budget Enforcement
 * Monitors Web Vitals and alerts when budgets are exceeded
 */

import { onLCP, onFID, onCLS, onTTFB, onINP } from 'web-vitals';
import * as Sentry from '@sentry/react';
import { logger } from '../logger';

const PERFORMANCE_BUDGET = {
  // Core Web Vitals
  LCP: 2500,  // Largest Contentful Paint (ms)
  FID: 100,   // First Input Delay (ms)
  CLS: 0.1,   // Cumulative Layout Shift (score)
  TTFB: 800,  // Time to First Byte (ms)
  INP: 200,   // Interaction to Next Paint (ms)
  
  // Custom metrics
  bundleSize: 1500000,    // 1.5 MB
  initialLoad: 3000,      // ms
};

interface PerformanceMetric extends Record<string, unknown> {
  name: string;
  value: number;
  budget: number;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const metricsCollected: PerformanceMetric[] = [];

export function enforcePerformanceBudget() {
  logger.info('Performance budget enforcement enabled', 'PerformanceBudget', PERFORMANCE_BUDGET);

  // Largest Contentful Paint
  onLCP((metric) => {
    const exceedBy = metric.value - PERFORMANCE_BUDGET.LCP;
    const metricData: PerformanceMetric = {
      name: 'LCP',
      value: metric.value,
      budget: PERFORMANCE_BUDGET.LCP,
      delta: exceedBy,
      rating: metric.rating,
    };

    metricsCollected.push(metricData);

    if (exceedBy > 0) {
      Sentry.captureMessage('Performance Budget Exceeded: LCP', {
        level: 'warning',
        tags: { 
          metric: 'LCP',
          rating: metric.rating,
        },
        contexts: {
          performance: {
            value: metric.value,
            budget: PERFORMANCE_BUDGET.LCP,
            exceedBy,
            rating: metric.rating,
            id: metric.id,
          },
        },
      });

      logger.warn('LCP budget exceeded', 'PerformanceBudget', metricData);
    } else {
      logger.debug('LCP within budget', 'PerformanceBudget', metricData);
    }
  });

  // First Input Delay
  onFID((metric) => {
    const exceedBy = metric.value - PERFORMANCE_BUDGET.FID;
    const metricData: PerformanceMetric = {
      name: 'FID',
      value: metric.value,
      budget: PERFORMANCE_BUDGET.FID,
      delta: exceedBy,
      rating: metric.rating,
    };

    metricsCollected.push(metricData);

    if (exceedBy > 0) {
      Sentry.captureMessage('Performance Budget Exceeded: FID', {
        level: 'warning',
        tags: { 
          metric: 'FID',
          rating: metric.rating,
        },
        contexts: {
          performance: {
            value: metric.value,
            budget: PERFORMANCE_BUDGET.FID,
            exceedBy,
            rating: metric.rating,
            id: metric.id,
          },
        },
      });

      logger.warn('FID budget exceeded', 'PerformanceBudget', metricData);
    } else {
      logger.debug('FID within budget', 'PerformanceBudget', metricData);
    }
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    const exceedBy = metric.value - PERFORMANCE_BUDGET.CLS;
    const metricData: PerformanceMetric = {
      name: 'CLS',
      value: metric.value,
      budget: PERFORMANCE_BUDGET.CLS,
      delta: exceedBy,
      rating: metric.rating,
    };

    metricsCollected.push(metricData);

    if (exceedBy > 0) {
      Sentry.captureMessage('Performance Budget Exceeded: CLS', {
        level: 'warning',
        tags: { 
          metric: 'CLS',
          rating: metric.rating,
        },
        contexts: {
          performance: {
            value: metric.value,
            budget: PERFORMANCE_BUDGET.CLS,
            exceedBy,
            rating: metric.rating,
            id: metric.id,
          },
        },
      });

      logger.warn('CLS budget exceeded', 'PerformanceBudget', metricData);
    } else {
      logger.debug('CLS within budget', 'PerformanceBudget', metricData);
    }
  });

  // Time to First Byte
  onTTFB((metric) => {
    const exceedBy = metric.value - PERFORMANCE_BUDGET.TTFB;
    const metricData: PerformanceMetric = {
      name: 'TTFB',
      value: metric.value,
      budget: PERFORMANCE_BUDGET.TTFB,
      delta: exceedBy,
      rating: metric.rating,
    };

    metricsCollected.push(metricData);

    if (exceedBy > 0) {
      Sentry.captureMessage('Performance Budget Exceeded: TTFB', {
        level: 'info',
        tags: { 
          metric: 'TTFB',
          rating: metric.rating,
        },
        contexts: {
          performance: {
            value: metric.value,
            budget: PERFORMANCE_BUDGET.TTFB,
            exceedBy,
            rating: metric.rating,
          },
        },
      });

      logger.warn('TTFB budget exceeded', 'PerformanceBudget', metricData);
    }
  });

  // Interaction to Next Paint
  onINP((metric) => {
    const exceedBy = metric.value - PERFORMANCE_BUDGET.INP;
    const metricData: PerformanceMetric = {
      name: 'INP',
      value: metric.value,
      budget: PERFORMANCE_BUDGET.INP,
      delta: exceedBy,
      rating: metric.rating,
    };

    metricsCollected.push(metricData);

    if (exceedBy > 0) {
      Sentry.captureMessage('Performance Budget Exceeded: INP', {
        level: 'warning',
        tags: { 
          metric: 'INP',
          rating: metric.rating,
        },
        contexts: {
          performance: {
            value: metric.value,
            budget: PERFORMANCE_BUDGET.INP,
            exceedBy,
            rating: metric.rating,
          },
        },
      });

      logger.warn('INP budget exceeded', 'PerformanceBudget', metricData);
    }
  });

  // Initial Load Time
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    const exceedBy = loadTime - PERFORMANCE_BUDGET.initialLoad;
    
    const metricData = {
      name: 'InitialLoad',
      value: loadTime,
      budget: PERFORMANCE_BUDGET.initialLoad,
      delta: exceedBy,
    };

    if (exceedBy > 0) {
      Sentry.captureMessage('Performance Budget Exceeded: Initial Load', {
        level: 'warning',
        tags: { metric: 'initialLoad' },
        contexts: {
          performance: {
            value: loadTime,
            budget: PERFORMANCE_BUDGET.initialLoad,
            exceedBy,
            navigationTiming: {
              domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
              domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
            },
          },
        },
      });

      logger.warn('Initial load budget exceeded', 'PerformanceBudget', metricData);
    } else {
      logger.info('Initial load within budget', 'PerformanceBudget', metricData);
    }
  });
}

/**
 * Get collected performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...metricsCollected];
}

/**
 * Check if all metrics are within budget
 */
export function areMetricsWithinBudget(): boolean {
  return metricsCollected.every(m => m.delta <= 0);
}
