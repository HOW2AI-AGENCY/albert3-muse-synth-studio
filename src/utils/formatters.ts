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
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatDuration = formatTime;

/**
 * Formats a number with non-breaking spaces as thousands separators (Russian locale).
 *
 * @param {number} num - The number to format.
 * @returns {string} The formatted number string.
 */
export const formatNumber = (num: number): string => {
  if (num === null || num === undefined) {
    return '0';
  }
  // Using Intl.NumberFormat for robust, locale-aware formatting.
  // The \u00A0 is a non-breaking space, which is correct for ru-RU locale.
  return new Intl.NumberFormat('ru-RU').format(num);
};

/**
 * Truncates a string to a specified maximum length, appending an ellipsis if truncated.
 *
 * @param {string} text - The text to truncate.
 * @param {number} maxLength - The maximum length of the output string (including ellipsis).
 * @returns {string} The truncated string.
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return '...';
  }
  return `${text.substring(0, maxLength - 3)}...`;
};

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

  return `${(bytes / 1024 ** i).toFixed(1).replace('.', ',')} ${sizes[i]}`;
};
