/**
 * Title Extraction Utility
 * Intelligently extracts track title from various sources
 */

/**
 * Extract meaningful title from available sources
 * Priority: explicit title → lyrics → prompt → timestamp fallback
 */
export function extractTitle(options: {
  title?: string;
  lyrics?: string;
  prompt?: string;
  language?: 'ru' | 'en';
}): string {
  const { title, lyrics, prompt, language = 'en' } = options;
  
  // 1. Use explicit title if provided and not generic
  if (title && title.trim() && !isGenericTitle(title)) {
    return title.trim();
  }
  
  // 2. Extract from lyrics (first meaningful line)
  if (lyrics) {
    const extracted = extractFromLyrics(lyrics);
    if (extracted) return extracted;
  }
  
  // 3. Extract from prompt (first few words)
  if (prompt) {
    const extracted = extractFromPrompt(prompt);
    if (extracted) return extracted;
  }
  
  // 4. Fallback to timestamp
  return getTimestampFallback(language);
}

/**
 * Check if title is generic/placeholder
 */
function isGenericTitle(title: string): boolean {
  const genericPatterns = [
    /^generated\s+track$/i,
    /^new\s+track$/i,
    /^untitled/i,
    /^track\s+\d+$/i,
    /^музыка$/i,
    /^трек$/i,
  ];
  
  return genericPatterns.some(pattern => pattern.test(title.trim()));
}

/**
 * Extract title from lyrics
 * Gets first non-tag line, removes structure markers
 */
function extractFromLyrics(lyrics: string): string | null {
  const lines = lyrics.split('\n');
  
  for (const line of lines) {
    // Remove structure markers: [Verse], [Chorus], [Intro], etc.
    const cleaned = line
      .replace(/^\[.*?\]\s*/g, '')
      .replace(/^\(.*?\)\s*/g, '')
      .trim();
    
    // Check if line is meaningful
    if (cleaned.length >= 3 && cleaned.length <= 60) {
      // Capitalize first letter
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }
  
  return null;
}

/**
 * Extract title from prompt
 * Takes first few meaningful words, removes service words
 */
function extractFromPrompt(prompt: string): string | null {
  // Remove common service words in multiple languages
  const cleaned = prompt
    .replace(/\b(create|generate|make|music|track|song|audio)\b/gi, '')
    .replace(/\b(создай|сгенерируй|сделай|музыка|музыку|трек|песня|песню|аудио)\b/gi, '')
    .replace(/[^\wА-Яа-яЁё\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  
  if (cleaned.length < 3) return null;
  
  // Take first 5 words (max 60 chars)
  const words = cleaned.split(/\s+/).slice(0, 5);
  const title = words.join(' ').slice(0, 60);
  
  if (title.length < 3) return null;
  
  // Capitalize first letter
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Add ellipsis if truncated
  return cleaned.split(/\s+/).length > 5 ? `${capitalized}...` : capitalized;
}

/**
 * Get timestamp-based fallback title
 */
function getTimestampFallback(language: 'ru' | 'en'): string {
  const date = new Date();
  
  if (language === 'ru') {
    const formatted = date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Трек от ${formatted}`;
  }
  
  const formatted = date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `Track ${formatted}`;
}
