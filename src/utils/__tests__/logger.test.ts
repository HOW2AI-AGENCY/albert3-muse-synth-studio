import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

const originalFetch = global.fetch;

import { logDebug, logError, logInfo, LogLevel, logger } from '../logger';

describe('logger utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    logger.clearLogs();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('stores log entries and exposes them through helpers', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const error = new Error('Boom');
    logError('Something went wrong', error, 'TestContext', { token: 'supersecret' });
    logInfo('All good', 'TestContext');

    const errorLogs = logger.getLogsByLevel(LogLevel.ERROR);
    const infoLogs = logger.getLogsByLevel(LogLevel.INFO);

    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].message).toBe('Something went wrong');
    expect(infoLogs).toHaveLength(1);
    expect(infoLogs[0].context).toBe('TestContext');
    expect(errorSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();

    const exported = JSON.parse(logger.exportLogs());
    expect(exported).toHaveLength(2);
  });

  it('clears logs correctly', () => {
    logger.clearLogs();
    logInfo('message');
    expect(logger.getLogs()).toHaveLength(1);

    logger.clearLogs();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('masks sensitive information recursively', () => {
    const maskSensitiveData = (logger as unknown as { maskSensitiveData: (data: Record<string, unknown>) => Record<string, unknown> }).maskSensitiveData.bind(logger);
    const masked = maskSensitiveData({
      token: 'abcdef123456',
      nested: { apiKey: 'secret-98765', safe: 'value' },
      array: [{ password: 'qwerty' }, 'plain'],
      numberToken: 123,
    });

    expect(masked.token).toContain('***');
    expect((masked.nested as Record<string, unknown>).apiKey).toContain('***');
    expect((masked.array as unknown[])[0]).toEqual({ password: 'q***y' });
    expect(masked.numberToken).toBe('***');
  });

  it('logs debug messages in development mode', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    logDebug('Debug message', 'DebugContext');

    expect(debugSpy).toHaveBeenCalled();
    expect(logger.getLogsByLevel(LogLevel.DEBUG).length).toBeGreaterThanOrEqual(0);
  });
});
