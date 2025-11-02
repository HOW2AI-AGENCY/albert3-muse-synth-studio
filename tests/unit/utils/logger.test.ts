/**
 * Logger Utility Tests
 * Week 1, Phase 1.2 - Core Utilities Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logInfo, logError, logWarn } from '@/utils/logger';

describe('Logger Utility', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger class', () => {
    it('should create logger with default context', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
    });

    it('should create logger with custom context', () => {
      const logger = new Logger('CustomContext');
      expect(logger).toBeDefined();
    });

    it('should log info messages', () => {
      const logger = new Logger('TestContext');
      logger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        expect.stringContaining('Test info message'),
        ''
      );
    });

    it('should log info messages with metadata', () => {
      const logger = new Logger('TestContext');
      const meta = { userId: '123', action: 'test' };
      logger.info('Test info', undefined, meta);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        expect.stringContaining('Test info'),
        meta
      );
    });

    it('should log warning messages', () => {
      const logger = new Logger('TestContext');
      logger.warn('Test warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        expect.stringContaining('Test warning'),
        ''
      );
    });

    it('should log error messages', () => {
      const logger = new Logger('TestContext');
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        expect.stringContaining('Error occurred'),
        error,
        ''
      );
    });

    it('should allow context override', () => {
      const logger = new Logger('DefaultContext');
      logger.info('Test message', 'OverrideContext');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OverrideContext]'),
        expect.stringContaining('Test message'),
        ''
      );
    });
  });

  describe('Exported helper functions', () => {
    it('should log info using logInfo helper', () => {
      logInfo('Helper info', 'HelperContext');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log warning using logWarn helper', () => {
      logWarn('Helper warning', 'HelperContext');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error using logError helper', () => {
      const error = new Error('Helper error');
      logError('Error message', error, 'HelperContext');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
