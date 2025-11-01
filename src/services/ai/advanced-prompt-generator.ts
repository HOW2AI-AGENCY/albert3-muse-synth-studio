import { supabase } from "@/integrations/supabase/client";
import type { StyleRecommendationResult } from "@/types/styles";

export interface AdvancedPromptRequest {
  styleRecommendations: StyleRecommendationResult;
  currentPrompt: string;
  currentLyrics?: string;
  genre?: string;
  mood?: string;
}

export interface AdvancedPromptResult {
  enhancedPrompt: string;
  formattedLyrics: string;
  metaTags: string[];
}

/**
 * Generates an advanced music creation prompt by integrating AI style recommendations
 * Uses Lovable AI (Gemini 2.5 Flash) via Edge Function
 */
export async function generateAdvancedPrompt(
  request: AdvancedPromptRequest
): Promise<AdvancedPromptResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-advanced-prompt', {
      body: request
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate advanced prompt');
    }

    if (!data?.result) {
      throw new Error('Invalid response from AI service');
    }

    return data.result;
  } catch (error) {
    console.error('[AdvancedPromptGenerator] Error:', error);
    throw error;
  }
}

/**
 * Formats lyrics with Suno AI meta-tags
 * Fallback function if edge function is unavailable
 */
export function formatLyricsWithMetaTags(
  lyrics: string,
  recommendations: StyleRecommendationResult
): string {
  if (!lyrics.trim()) return '';

  const metaTags: string[] = [];
  
  // Extract tempo from techniques
  const tempoMatch = recommendations.techniques.find(t => 
    /\d+\s*bpm/i.test(t)
  );
  if (tempoMatch) {
    metaTags.push(`[Tempo: ${tempoMatch}]`);
  }

  // Add style tags
  if (recommendations.tags.length > 0) {
    metaTags.push(`[Style: ${recommendations.tags.slice(0, 3).join(', ')}]`);
  }

  // Add instrument hints
  if (recommendations.instruments.length > 0) {
    metaTags.push(`[Instruments: ${recommendations.instruments.slice(0, 3).join(', ')}]`);
  }

  // Add vocal style if present
  if (recommendations.vocalStyle) {
    metaTags.push(`[Vocals: ${recommendations.vocalStyle}]`);
  }

  return `${metaTags.join(' ')}\n\n${lyrics}`;
}

/**
 * Extracts key meta-tags from style recommendations
 */
export function extractMetaTagsFromRecommendations(
  recommendations: StyleRecommendationResult
): string[] {
  const metaTags: string[] = [];

  // Style tags
  if (recommendations.tags.length > 0) {
    metaTags.push(`Style: ${recommendations.tags.join(', ')}`);
  }

  // Instruments
  if (recommendations.instruments.length > 0) {
    metaTags.push(`Instruments: ${recommendations.instruments.join(', ')}`);
  }

  // Techniques
  if (recommendations.techniques.length > 0) {
    metaTags.push(`Techniques: ${recommendations.techniques.join(', ')}`);
  }

  // Vocal style
  if (recommendations.vocalStyle) {
    metaTags.push(`Vocal: ${recommendations.vocalStyle}`);
  }

  return metaTags;
}
