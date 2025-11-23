// src/utils/formatters.ts

/**
 * Formats a given time in seconds into a mm:ss string format.
 *
 * @param {number} seconds - The time in seconds to format.
 * @returns {string} The formatted time string (e.g., "02:45").
 */
export const formatTime = (seconds: number): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '00:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatDuration = formatTime;
