import DOMPurify from 'dompurify';

/**
 * Sanitizes a string to prevent XSS attacks.
 * It removes any potentially malicious HTML, allowing only safe tags.
 *
 * @param dirty - The raw, potentially unsafe string.
 * @returns A sanitized, safe-to-render string.
 */
export const sanitize = (dirty: string | null | undefined): string => {
  if (!dirty) {
    return '';
  }

  // Allow configuration for what's considered safe if needed in the future
  const sanitized = DOMPurify.sanitize(dirty);

  return sanitized;
};
