/**
 * Lyrics Sanitization Utility
 * 
 * ✅ FIX: XSS Protection for AI-generated lyrics
 * Prevents script injection through lyrics content from Suno/Mureka API
 */

import DOMPurify from 'dompurify';
import { logWarn } from './logger';

/**
 * Sanitize lyrics text to prevent XSS attacks
 * Removes all HTML tags and potentially malicious content
 */
export function sanitizeLyrics(lyrics: string | null | undefined): string {
  if (!lyrics) return '';

  // ✅ Remove ALL HTML tags, keep only plain text
  const sanitized = DOMPurify.sanitize(lyrics, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });

  // ✅ Additional check: detect if original had suspicious content
  const hasSuspiciousContent = /<script|<iframe|javascript:|on\w+=/i.test(lyrics);
  
  if (hasSuspiciousContent) {
    logWarn('Suspicious content detected in lyrics and sanitized', 'sanitizeLyrics', {
      originalLength: lyrics.length,
      sanitizedLength: sanitized.length,
      sample: lyrics.substring(0, 100),
    });
  }

  return sanitized;
}

/**
 * Sanitize an array of lyrics strings
 */
export function sanitizeLyricsArray(lyricsArray: (string | null | undefined)[]): string[] {
  return lyricsArray.map(sanitizeLyrics);
}

/**
 * Check if text contains potentially dangerous content
 * (for logging/monitoring purposes)
 */
export function containsDangerousContent(text: string | null | undefined): boolean {
  if (!text) return false;
  
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers like onclick=
    /<embed/i,
    /<object/i,
    /data:text\/html/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(text));
}
