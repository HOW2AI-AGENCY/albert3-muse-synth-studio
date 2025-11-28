/**
 * Unit tests for PerformanceMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }
}));

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.useFakeTimers();
    // Mock performance.now() to work with fake timers
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 1000; // Simulate time passing
      return time;
    });
  });

  it('should start and end timer correctly', () => {
    const id = 'test-operation';
    monitor.startTimer(id);

    vi.advanceTimersByTime(1000);

    const duration = monitor.endTimer(id, 'test-metric');

    expect(duration).toBeGreaterThanOrEqual(1000);
  });

  it('should record manual metrics', () => {
    monitor.recordMetric('custom-metric', 100, 'test-context');

    const metrics = monitor.getMetrics({ name: 'custom-metric' });

    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(100);
    expect(metrics[0].context).toBe('test-context');
  });

  it('should calculate statistics correctly', () => {
    monitor.recordMetric('test-stat', 100);
    monitor.recordMetric('test-stat', 200);
    monitor.recordMetric('test-stat', 300);

    const stats = monitor.getStats('test-stat');

    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(3);
    expect(stats?.avg).toBe(200);
    expect(stats?.min).toBe(100);
    expect(stats?.max).toBe(300);
  });

  it('should filter metrics by context', () => {
    monitor.recordMetric('metric1', 100, 'context-a');
    monitor.recordMetric('metric2', 200, 'context-b');

    const filtered = monitor.getMetrics({ context: 'context-a' });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].context).toBe('context-a');
  });

  it('should filter metrics by time range', () => {
    const now = Date.now();

    monitor.recordMetric('old-metric', 100);

    vi.setSystemTime(now + 10000);

    monitor.recordMetric('new-metric', 200);

    const recent = monitor.getMetrics({ since: now + 5000 });

    expect(recent).toHaveLength(1);
    expect(recent[0].name).toBe('new-metric');
  });

  it('should handle missing timer gracefully', () => {
    const duration = monitor.endTimer('non-existent', 'test');

    expect(duration).toBeNull();
  });

  it('should clear metrics', () => {
    monitor.recordMetric('test', 100);

    expect(monitor.getMetrics()).toHaveLength(1);

    monitor.clearMetrics();

    expect(monitor.getMetrics()).toHaveLength(0);
  });

  it('should export metrics as JSON', () => {
    monitor.recordMetric('export-test', 100);

    const exported = monitor.exportMetrics();
    const parsed = JSON.parse(exported);

    expect(parsed.metrics).toHaveLength(1);
    expect(parsed.metrics[0].name).toBe('export-test');
  });

  it('should log slow operations', () => {
    // The spy is now on the mocked logger, not the console
    const loggerSpy = vi.spyOn(logger, 'warn');

    monitor.startTimer('slow-op');

    // We need to advance the mocked performance.now, not just the fake timers
    const performanceSpy = vi.spyOn(performance, 'now');
    performanceSpy.mockReturnValueOnce(0); // Start time
    performanceSpy.mockReturnValueOnce(2000); // End time, exceeds 1000ms threshold

    monitor.endTimer('slow-op', 'slow-metric');

    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should calculate percentiles correctly', () => {
    // Add 100 metrics
    for (let i = 1; i <= 100; i++) {
      monitor.recordMetric('percentile-test', i);
    }

    const stats = monitor.getStats('percentile-test');

    expect(stats).not.toBeNull();
    expect(stats?.p50).toBe(50);
    expect(stats?.p95).toBeGreaterThanOrEqual(95);
    expect(stats?.p99).toBeGreaterThanOrEqual(99);
  });

  it('should handle metadata in metrics', () => {
    const metadata = {
      userId: '123',
      provider: 'suno',
      cached: true,
    };

    monitor.recordMetric('metadata-test', 100, 'test', metadata);

    const metrics = monitor.getMetrics({ name: 'metadata-test' });

    expect(metrics[0].metadata).toEqual(metadata);
  });
});
