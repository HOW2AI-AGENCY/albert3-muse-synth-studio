// src/utils/formatters.ts

import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Formats a date string or Date object into a localized, readable format.
 * Example: "25 янв. 2025 г."
 *
 * @param {string | Date} date - The date to format.
 * @returns {string} The formatted date string, or an empty string if invalid.
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) {
    return '';
  }
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    // Use 'd MMM yyyy г.' to get abbreviated month name as expected by tests
    return format(dateObj, 'd MMM yyyy г.', { locale: ru });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Invalid date value for formatDate:', date, error);
    return '';
  }
};

/**
 * Formats a given time in seconds into a m:ss string format.
 *
 * @param {number} seconds - The time in seconds to format.
 * @returns {string} The formatted time string (e.g., "2:05").
 */
export const formatTime = (seconds: number): string => {
  // Handle invalid inputs as expected by formatDuration tests
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '—';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  // Do not pad minutes as per test expectations (e.g., '1:05', not '01:05')
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// formatDuration is an alias for formatTime.
// The tests for both are compatible with the single implementation above.
export const formatDuration = formatTime;

/**
 * Formats a file size in bytes into a human-readable string with units (Б, КБ, МБ, ГБ).
 *
 * @param {number | null | undefined} bytes - The file size in bytes.
 * @returns {string} The formatted file size string.
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
    return '0 Б';
  }
  if (bytes === 0) {
    return '0 Б';
  }

  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  if (i === 0) {
    return `${bytes} ${sizes[i]}`;
  }

  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};
