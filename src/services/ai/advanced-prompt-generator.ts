import { supabase } from "@/integrations/supabase/client";
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import type { StyleRecommendationResult } from "@/types/styles";
import { logger } from "@/utils/logger";

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
    // Check authentication before calling the function
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      throw new Error('Вы должны быть авторизованы для использования этой функции');
    }

    const { data, error } = await SupabaseFunctions.invoke('generate-advanced-prompt', {
      body: request,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      // Handle specific error codes
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      }
      if (error.message?.includes('429')) {
        throw new Error('Слишком много запросов. Попробуйте позже.');
      }
      if (error.message?.includes('402')) {
        throw new Error('Недостаточно AI-кредитов. Пополните баланс.');
      }
      throw new Error(error.message || 'Не удалось сгенерировать промпт');
    }

    if (!data?.result) {
      throw new Error('Некорректный ответ от AI-сервиса');
    }

    return data.result;
  } catch (error) {
    logger.error('Failed to generate advanced prompt', error instanceof Error ? error : undefined, 'AdvancedPromptGenerator', {
      hasSession: !!request,
    });
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
