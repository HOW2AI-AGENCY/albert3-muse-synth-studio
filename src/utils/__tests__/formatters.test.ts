import { describe, it, expect } from 'vitest';
import { formatDuration, formatDate, formatFileSize } from '../formatters';

describe('formatDuration', () => {
  it('formats seconds correctly', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(59)).toBe('0:59');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hours, minutes and seconds correctly', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3665)).toBe('1:01:05');
    expect(formatDuration(7325)).toBe('2:02:05');
  });

  it('handles null and undefined', () => {
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
  });

  it('rounds decimal values', () => {
    expect(formatDuration(65.7)).toBe('1:06');
    expect(formatDuration(125.3)).toBe('2:05');
  });
});

describe('formatDate', () => {
  it('formats date strings correctly', () => {
    const dateString = '2024-01-15T12:00:00Z';
    const formatted = formatDate(dateString);
    
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('handles invalid dates', () => {
    expect(formatDate('invalid')).toBe('Invalid date');
    expect(formatDate('')).toBe('Invalid date');
  });

  it('handles null and undefined', () => {
    expect(formatDate(null)).toBe('Invalid date');
    expect(formatDate(undefined)).toBe('Invalid date');
  });

  it('formats Date objects', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const formatted = formatDate(date);
    
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10240)).toBe('10.0 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(5242880)).toBe('5.0 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
    expect(formatFileSize(2147483648)).toBe('2.0 GB');
  });

  it('handles null and undefined', () => {
    expect(formatFileSize(null)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
  });

  it('handles negative values', () => {
    expect(formatFileSize(-100)).toBe('0 B');
  });
});
