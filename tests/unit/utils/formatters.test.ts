/**
 * Formatters Utility Tests
 */
import { describe, it, expect } from 'vitest';
import { formatDuration, formatDate, formatNumber, truncateText, formatFileSize } from '@/utils/formatters';

describe('Formatters Utility', () => {
  describe('formatDuration', () => {
    it('should format seconds to M:SS', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle invalid inputs gracefully', () => {
        // @ts-ignore
        expect(formatDuration(null)).toBe('0:00');
        // @ts-ignore
        expect(formatDuration(undefined)).toBe('0:00');
        expect(formatDuration(NaN)).toBe('0:00');
        expect(formatDuration(-10)).toBe('0:00');
    });

    it('should handle large durations', () => {
      expect(formatDuration(7200)).toBe('120:00');
      expect(formatDuration(86400)).toBe('1440:00');
    });
  });

  describe('formatDate', () => {
    it('should format a Date object correctly for ru locale', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      // format uses local timezone, so result depends on test runner environment.
      // We check for components instead of exact string.
      const formatted = formatDate(date);
      expect(formatted).toMatch(/15 янв\. 2025 г\./);
    });

    it('should format an ISO date string correctly', () => {
      const dateStr = '2025-01-15T10:30:00Z';
      const formatted = formatDate(dateStr);
      expect(formatted).toMatch(/15 янв\. 2025 г\./);
    });

    it('should return empty string for invalid dates', () => {
        expect(formatDate(null)).toBe('');
        expect(formatDate(undefined)).toBe('');
        expect(formatDate('invalid-date')).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with a non-breaking space separator', () => {
      expect(formatNumber(1000)).toBe('1\u00A0000');
      expect(formatNumber(1500)).toBe('1\u00A0500');
      expect(formatNumber(999999)).toBe('999\u00A0999');
    });

    it('should format millions with non-breaking space separators', () => {
      expect(formatNumber(1000000)).toBe('1\u00A0000\u00A0000');
      expect(formatNumber(2500000)).toBe('2\u00A0500\u00A0000');
    });
  });

  describe('truncateText', () => {
    it('should not truncate text shorter than maxLength', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text and add ellipsis', () => {
      const longText = 'This is a very long text';
      expect(truncateText(longText, 15)).toBe('This is a ve...');
    });

    it('should return ellipsis if maxLength is 3 or less', () => {
      expect(truncateText('Looooong', 3)).toBe('...');
      expect(truncateText('Looooong', 2)).toBe('...');
    });

    it('should return original text if it equals maxLength', () => {
        expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should return empty string for empty input', () => {
        expect(truncateText('', 10)).toBe('');
    });
  });

  describe('formatFileSize', () => {
      it('should format bytes correctly', () => {
          expect(formatFileSize(100)).toBe('100 Б');
      });
      it('should format kilobytes correctly', () => {
          expect(formatFileSize(1536)).toBe('1,5 КБ');
      });
      it('should format megabytes correctly', () => {
          expect(formatFileSize(1572864)).toBe('1,5 МБ');
      });
      it('should return "0 Б" for zero or invalid input', () => {
          expect(formatFileSize(0)).toBe('0 Б');
          expect(formatFileSize(null)).toBe('0 Б');
          expect(formatFileSize(undefined)).toBe('0 Б');
          expect(formatFileSize(-100)).toBe('0 Б');
      });
  });
});
