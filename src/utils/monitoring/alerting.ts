/**
 * Alerting System for Critical Metrics
 * Monitors key performance indicators and sends alerts to Sentry
 */

import * as Sentry from '@sentry/react';
import { metricsCollector } from './metrics';
import { logger } from '../logger';

interface AlertRule {
  metric: string;
  threshold: number;
  condition: 'above' | 'below';
  severity: 'info' | 'warning' | 'critical';
}

const ALERT_RULES: AlertRule[] = [
  {
    metric: 'generation.successRate',
    threshold: 90,
    condition: 'below',
    severity: 'critical',
  },
  {
    metric: 'generation.avgDuration',
    threshold: 180000, // 3 minutes
    condition: 'above',
    severity: 'warning',
  },
  {
    metric: 'rateLimit.hits',
    threshold: 5,
    condition: 'above',
    severity: 'warning',
  },
  {
    metric: 'player.errorRate',
    threshold: 10,
    condition: 'above',
    severity: 'warning',
  },
];

export class AlertingSystem {
  private lastAlerts = new Map<string, number>();
  private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts
  private intervalId: NodeJS.Timeout | null = null;

  checkMetrics() {
    const genStats = metricsCollector.getGenerationStats(3600000); // 1 hour
    const rateLimitStats = metricsCollector.getRateLimitStats(3600000);

    // Check Success Rate
    if (genStats.successRate < 90) {
      this.triggerAlert(
        'LOW_SUCCESS_RATE',
        'critical',
        `Generation success rate: ${genStats.successRate.toFixed(1)}% (threshold: 90%)`,
        { 
          successRate: genStats.successRate,
          total: genStats.total,
          completed: genStats.completed,
          failed: genStats.failed,
        }
      );
    }

    // Check Average Duration
    if (genStats.avgDuration > 180000) {
      this.triggerAlert(
        'SLOW_GENERATION',
        'warning',
        `Average generation time: ${(genStats.avgDuration / 1000).toFixed(1)}s (threshold: 180s)`,
        { 
          avgDuration: genStats.avgDuration,
          slowestProvider: this.findSlowestProvider(genStats.byProvider),
        }
      );
    }

    // Check Rate Limits
    if (rateLimitStats.total > 5) {
      this.triggerAlert(
        'HIGH_RATE_LIMITS',
        'warning',
        `Rate limits hit ${rateLimitStats.total} times in last hour`,
        { 
          rateLimitStats,
          topProvider: this.findMostRateLimitedProvider(rateLimitStats.byProvider),
        }
      );
    }

    logger.debug('Metrics check completed', 'AlertingSystem', {
      successRate: genStats.successRate,
      avgDuration: genStats.avgDuration,
      rateLimitsHit: rateLimitStats.total,
    });
  }

  private findSlowestProvider(byProvider: Record<string, any>): string | null {
    let slowest: string | null = null;
    let maxDuration = 0;

    for (const [provider, stats] of Object.entries(byProvider)) {
      if (stats.avgDuration > maxDuration) {
        maxDuration = stats.avgDuration;
        slowest = provider;
      }
    }

    return slowest;
  }

  private findMostRateLimitedProvider(byProvider: Record<string, number>): string | null {
    let top: string | null = null;
    let maxHits = 0;

    for (const [provider, hits] of Object.entries(byProvider)) {
      if (hits > maxHits) {
        maxHits = hits;
        top = provider;
      }
    }

    return top;
  }

  private triggerAlert(
    alertId: string,
    severity: 'info' | 'warning' | 'critical',
    message: string,
    metadata: Record<string, unknown>
  ) {
    const lastAlert = this.lastAlerts.get(alertId);
    const now = Date.now();

    // Cooldown check
    if (lastAlert && now - lastAlert < this.COOLDOWN_MS) {
      logger.debug('Alert suppressed due to cooldown', 'AlertingSystem', {
        alertId,
        lastTriggered: new Date(lastAlert).toISOString(),
        cooldownRemaining: this.COOLDOWN_MS - (now - lastAlert),
      });
      return;
    }

    // Send to Sentry
    Sentry.captureMessage(message, {
      level: severity === 'critical' ? 'error' : severity,
      tags: { 
        alertId, 
        severity,
        alertType: 'performance',
      },
      contexts: { 
        alert: metadata,
      },
    });

    // Console logging
    const emoji = severity === 'critical' ? '🚨' : '⚠️';
    console.warn(`${emoji} [Alert] ${severity.toUpperCase()}: ${message}`, metadata);
    logger.warn(message, 'AlertingSystem', { alertId, severity, ...metadata });

    this.lastAlerts.set(alertId, now);
  }

  startMonitoring(intervalMs = 60000) {
    if (this.intervalId) {
      logger.warn('Alerting system already running', 'AlertingSystem');
      return;
    }

    logger.info('Starting alerting system', 'AlertingSystem', {
      checkInterval: intervalMs,
      rules: ALERT_RULES.length,
    });

    // Initial check
    this.checkMetrics();

    // Periodic checks
    this.intervalId = setInterval(() => {
      this.checkMetrics();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Alerting system stopped', 'AlertingSystem');
    }
  }

  clearAlertHistory() {
    this.lastAlerts.clear();
    logger.info('Alert history cleared', 'AlertingSystem');
  }
}

export const alertingSystem = new AlertingSystem();
