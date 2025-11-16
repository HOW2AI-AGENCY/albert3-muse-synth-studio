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

/**
 * Sanitize prompt text (no HTML allowed)
 */
export const sanitizePrompt = (text: string): string => {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No HTML tags
    KEEP_CONTENT: true,
    ALLOWED_ATTR: [],
  }).trim();
};

/**
 * Sanitize lyrics (preserve line breaks, no HTML)
 */
export const sanitizeLyrics = (text: string): string => {
  if (!text) return '';
  
  // Preserve line breaks by replacing them with a placeholder
  const withPlaceholders = text.replace(/\n/g, '__NEWLINE__');
  
  const sanitized = DOMPurify.sanitize(withPlaceholders, {
    ALLOWED_TAGS: [], // No HTML tags
    KEEP_CONTENT: true,
    ALLOWED_ATTR: [],
  });
  
  // Restore line breaks
  return sanitized.replace(/__NEWLINE__/g, '\n').trim();
};

/**
 * Sanitize track title
 */
export const sanitizeTitle = (text: string): string => {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
    ALLOWED_ATTR: [],
  }).trim();
};

/**
 * Sanitize URLs (prevent javascript: and data: URIs)
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  const lowerUrl = trimmed.toLowerCase();
  
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    return '';
  }
  
  return trimmed;
};

/**
 * Batch sanitization for track data
 */
export interface TrackInput {
  title?: string;
  prompt?: string;
  lyrics?: string;
  tags?: string[];
  description?: string;
}

export const sanitizeTrackInput = (input: TrackInput): TrackInput => {
  return {
    title: input.title ? sanitizeTitle(input.title) : undefined,
    prompt: input.prompt ? sanitizePrompt(input.prompt) : undefined,
    lyrics: input.lyrics ? sanitizeLyrics(input.lyrics) : undefined,
    tags: input.tags ? input.tags.map(tag => sanitize(tag)) : undefined,
    description: input.description ? sanitize(input.description) : undefined,
  };
};
