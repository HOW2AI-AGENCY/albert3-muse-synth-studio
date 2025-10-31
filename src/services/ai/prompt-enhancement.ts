import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface EnhancePromptParams {
  prompt: string;
  genre?: string;
  mood?: string;
  tags?: string;
  provider: 'suno' | 'mureka';
}

export interface EnhancePromptResult {
  enhancedPrompt: string;
  addedElements: string[];
  reasoning: string;
}

/**
 * Enhance a music generation prompt using AI
 */
export const enhancePrompt = async (
  params: EnhancePromptParams
): Promise<EnhancePromptResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('enhance-generation-prompt', {
      body: params,
    });

    if (error) {
      logger.error('Error enhancing prompt', error instanceof Error ? error : new Error(String(error)), 'prompt-enhancement');
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to enhance prompt');
    }

    return data.data;
  } catch (error) {
    logger.error('Failed to enhance prompt', error instanceof Error ? error : new Error(String(error)), 'prompt-enhancement');
    throw error;
  }
};

/**
 * Check if user has auto-accept enabled for AI enhancements
 */
export const isAutoAcceptEnabled = (): boolean => {
  return localStorage.getItem('ai-enhance-auto-accept') === 'true';
};

/**
 * Check if AI enhancement is enabled in settings
 */
export const isEnhancementEnabled = (): boolean => {
  const setting = localStorage.getItem('ai-enhance-enabled');
  return setting !== 'false'; // Enabled by default
};

/**
 * Toggle AI enhancement feature
 */
export const setEnhancementEnabled = (enabled: boolean): void => {
  localStorage.setItem('ai-enhance-enabled', enabled ? 'true' : 'false');
};

/**
 * Reset auto-accept preference
 */
export const resetAutoAccept = (): void => {
  localStorage.removeItem('ai-enhance-auto-accept');
};
