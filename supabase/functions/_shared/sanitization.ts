/**
 * Input Sanitization Module
 * Prevents XSS, SQL injection, and other security vulnerabilities
 */

/**
 * Sanitize string input by removing dangerous characters
 * @param input - Raw string input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  // 1. Trim whitespace
  let cleaned = input.trim();
  
  // 2. Remove control characters (except \n, \r, \t)
  // Избегаем использования контролов в регулярках (no-control-regex),
  // выполняем фильтрацию по charCode вручную для прозрачности и безопасности
  const removeControlChars = (str: string): string => {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Разрешаем табуляцию (9), перевод строки (10) и возврат каретки (13)
      const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
      const isPrintable = (code >= 32 && code !== 127);
      if (isPrintable || isAllowedWhitespace) {
        out += str[i];
      }
    }
    return out;
  };
  cleaned = removeControlChars(cleaned);
  
  // 3. Remove HTML tags (basic XSS prevention)
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // 4. Enforce length limit
  cleaned = cleaned.slice(0, maxLength);
  
  return cleaned;
}

/**
 * Sanitize prompt for music generation
 * @param prompt - Raw prompt text
 * @returns Sanitized prompt (max 2000 chars)
 */
export function sanitizePrompt(prompt: string): string {
  return sanitizeString(prompt, 2000);
}

/**
 * Sanitize lyrics text
 * @param lyrics - Raw lyrics text
 * @returns Sanitized lyrics (max 10000 chars)
 */
export function sanitizeLyrics(lyrics: string): string {
  return sanitizeString(lyrics, 10000);
}

/**
 * Sanitize style tags
 * @param tags - Raw tags string or array
 * @returns Sanitized tags string
 */
export function sanitizeStyleTags(tags: string | string[]): string {
  if (Array.isArray(tags)) {
    return tags
      .map(tag => sanitizeString(tag, 50))
      .filter(tag => tag.length > 0)
      .slice(0, 20) // Max 20 tags
      .join(', ');
  }
  
  return sanitizeString(tags, 500);
}

/**
 * Sanitize title
 * @param title - Raw title text
 * @returns Sanitized title (max 200 chars)
 */
export function sanitizeTitle(title: string): string {
  return sanitizeString(title, 200);
}

/**
 * Validate and sanitize URL
 * @param url - Raw URL string
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url);
    
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize user ID (UUID validation)
 * @param userId - Raw user ID
 * @returns Valid UUID or null
 */
export function sanitizeUserId(userId: string): string | null {
  if (!userId || typeof userId !== 'string') return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(userId)) {
    return null;
  }
  
  return userId;
}

/**
 * Sanitize numeric value
 * @param value - Raw numeric value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default value if invalid
 * @returns Sanitized number
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = Number(value);
  
  if (isNaN(num)) return defaultValue;
  if (num < min) return min;
  if (num > max) return max;
  
  return num;
}
