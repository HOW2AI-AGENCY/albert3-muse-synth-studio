/**
 * Formatters Utility Tests
 * Week 1, Phase 1.2 - Core Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import { formatDuration, formatDate, formatNumber, truncateText } from '@/utils/formatters';

describe('Formatters Utility', () => {
  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should pad seconds with zero', () => {
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(305)).toBe('5:05');
    });

    it('should handle large durations', () => {
      expect(formatDuration(7200)).toBe('120:00');
      expect(formatDuration(86400)).toBe('1440:00');
    });
  });

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2025-01-15T10:30:00');
      const formatted = formatDate(date);

      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should format date string', () => {
      const dateStr = '2025-01-15T10:30:00';
      const formatted = formatDate(dateStr);

      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should include time', () => {
      const date = new Date('2025-01-15T10:30:00');
      const formatted = formatDate(date);

      expect(formatted).toContain('10');
      expect(formatted).toContain('30');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(42000)).toBe('42.0K');
      expect(formatNumber(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(2500000)).toBe('2.5M');
      expect(formatNumber(42000000)).toBe('42.0M');
    });

    it('should handle edge cases', () => {
      expect(formatNumber(1001)).toBe('1.0K');
      expect(formatNumber(1000001)).toBe('1.0M');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    it('should truncate long text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very lo...');
    });

    it('should truncate at exact length including ellipsis', () => {
      const text = 'Hello World';
      const truncated = truncateText(text, 8);
      
      expect(truncated.length).toBeLessThanOrEqual(8);
      expect(truncated).toContain('...');
    });

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('Hi', 2)).toBe('Hi');
      expect(truncateText('Test', 4)).toBe('Test');
      expect(truncateText('Test', 3)).toBe('...');
    });
  });
});
