import { describe, it, expect } from 'vitest';
import { formatDuration, formatDate, formatFileSize, formatTime } from '../formatters';

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

  it('formats large minutes values correctly', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(3665)).toBe('61:05');
  });

  it('handles null and undefined', () => {
    expect(formatDuration(null as unknown as number)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });

  it('does not round up decimal values due to Math.floor', () => {
    expect(formatDuration(65.7)).toBe('1:05');
    expect(formatDuration(125.3)).toBe('2:05');
  });
});

describe('formatTime', () => {
  it('formats time correctly', () => {
    expect(formatTime(125)).toBe('2:05');
  });
});

describe('formatDate', () => {
  it('formats date strings correctly for ru-RU', () => {
    const dateString = '2024-01-15T12:00:00Z';
    const formatted = formatDate(dateString);
    expect(formatted).toMatch(/15 янв. 2024 г./);
  });

  it('handles invalid dates gracefully', () => {
    expect(formatDate('invalid')).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('handles null and undefined gracefully', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('formats Date objects correctly for ru-RU', () => {
    const date = new Date('2024-03-20T12:00:00Z');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/20 мар. 2024 г./);
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Б');
    expect(formatFileSize(500)).toBe('500 Б');
    expect(formatFileSize(1023)).toBe('1023 Б');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 КБ');
    expect(formatFileSize(1536)).toBe('1.5 КБ');
    expect(formatFileSize(10240)).toBe('10.0 КБ');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.0 МБ');
    expect(formatFileSize(5242880)).toBe('5.0 МБ');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 ГБ');
    expect(formatFileSize(2147483648)).toBe('2.0 ГБ');
  });

  it('handles null and undefined gracefully', () => {
    expect(formatFileSize(null as unknown as number)).toBe('0 Б');
    expect(formatFileSize(undefined as unknown as number)).toBe('0 Б');
  });

  it('handles negative values gracefully', () => {
    expect(formatFileSize(-100)).toBe('0 Б');
  });
});
