/**
 * Logger Utility Tests
 * Week 1, Phase 1.2 - Core Utilities Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, logInfo, logError, logWarn } from '../../../src/utils/logger';

describe('Logger Utility', () => {
  let consoleInfoSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger singleton', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should log info messages', () => {
      logger.info('Test info message', 'TestContext');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const firstArg = consoleInfoSpy.mock.calls[0][0];
      expect(firstArg).toEqual(expect.stringContaining('[TestContext]'));
      expect(firstArg).toEqual(expect.stringContaining('Test info message'));
    });

    it('should log info messages with metadata', () => {
      const meta = { userId: '123', action: 'test' };
      logger.info('Test info', 'TestContext', meta);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        meta
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning', 'TestContext');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const firstArg = consoleWarnSpy.mock.calls[0][0];
      expect(firstArg).toEqual(expect.stringContaining('[TestContext]'));
      expect(firstArg).toEqual(expect.stringContaining('Test warning'));
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, 'TestContext');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const firstArg = consoleErrorSpy.mock.calls[0][0];
      expect(firstArg).toEqual(expect.stringContaining('[TestContext]'));
      expect(firstArg).toEqual(expect.stringContaining('Error occurred'));
    });

    it('should allow context override', () => {
      logger.info('Test message', 'OverrideContext');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const firstArg = consoleInfoSpy.mock.calls[0][0];
      expect(firstArg).toEqual(expect.stringContaining('[OverrideContext]'));
      expect(firstArg).toEqual(expect.stringContaining('Test message'));
    });
  });

  describe('Exported helper functions', () => {
    it('should log info using logInfo helper', () => {
      logInfo('Helper info', 'HelperContext');

      expect(consoleInfoSpy).toHaveBeenCalled();
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
