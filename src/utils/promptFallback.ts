import type { StyleRecommendationResult } from "@/types/styles";

/**
 * Basic prompt enhancer - fallback when AI service is unavailable
 * Uses template-based enhancement with style recommendations
 */
export function basicPromptEnhancer(
  currentPrompt: string,
  recommendations: StyleRecommendationResult,
  genre?: string,
  mood?: string
): string {
  const parts: string[] = [currentPrompt.trim()];

  // Add genre and mood if provided
  if (genre && !currentPrompt.toLowerCase().includes(genre.toLowerCase())) {
    parts.push(`in ${genre} style`);
  }

  if (mood && !currentPrompt.toLowerCase().includes(mood.toLowerCase())) {
    parts.push(`with ${mood} mood`);
  }

  // Add top recommended tags (max 3)
  const topTags = recommendations.tags.slice(0, 3);
  if (topTags.length > 0) {
    parts.push(`featuring ${topTags.join(', ')}`);
  }

  // Add instruments (max 2)
  const topInstruments = recommendations.instruments.slice(0, 2);
  if (topInstruments.length > 0) {
    parts.push(`with ${topInstruments.join(' and ')}`);
  }

  // Add vocal style if present
  if (recommendations.vocalStyle) {
    parts.push(`vocals: ${recommendations.vocalStyle}`);
  }

  return parts.join(', ');
}

/**
 * Basic lyrics formatter - fallback when AI service is unavailable
 * Adds simple Suno meta-tags based on recommendations
 */
export function basicLyricsFormatter(
  lyrics: string,
  recommendations: StyleRecommendationResult
): string {
  if (!lyrics.trim()) return '';

  const metaTags: string[] = [];

  // Add style tag
  if (recommendations.tags.length > 0) {
    metaTags.push(`[${recommendations.tags[0]}]`);
  }

  // Add vocal style
  if (recommendations.vocalStyle) {
    metaTags.push(`[${recommendations.vocalStyle}]`);
  }

  // Prepend meta-tags to lyrics
  return metaTags.length > 0 
    ? `${metaTags.join(' ')}\n\n${lyrics}` 
    : lyrics;
}

/**
 * Creates a fallback enhanced prompt result
 */
export function createFallbackResult(
  currentPrompt: string,
  currentLyrics: string,
  recommendations: StyleRecommendationResult,
  genre?: string,
  mood?: string
) {
  return {
    enhancedPrompt: basicPromptEnhancer(currentPrompt, recommendations, genre, mood),
    formattedLyrics: basicLyricsFormatter(currentLyrics, recommendations),
    metaTags: recommendations.tags.slice(0, 5),
    isFallback: true,
  };
}
