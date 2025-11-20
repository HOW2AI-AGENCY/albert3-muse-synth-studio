import { useCallback } from 'react';
import { useGenerationState } from './generation/useGenerationState';
import { useGenerationValidation } from './generation/useGenerationValidation';
import { useGenerationRateLimit } from './generation/useGenerationRateLimit';
import { useGenerationSubscription } from './generation/useGenerationSubscription';
import { useAuth } from '@/contexts/auth/useAuth';
import { GenerationService, GenerationRequest } from '@/services/generation';
import { sanitizePrompt, sanitizeLyrics, sanitizeTitle } from '@/utils/sanitization';

export interface GenerationResult {
    success: boolean;
    trackId?: string;
    errors?: string[];
}

interface UseGenerateMusicOptions {
  provider?: 'suno' | 'replicate';
  onSuccess?: (trackId: string) => void;
}

export const useGenerateMusic = ({ provider = 'suno', onSuccess }: UseGenerateMusicOptions = {}) => {
  const { isGenerating, setIsGenerating, error, setError } = useGenerationState();
  const { validate } = useGenerationValidation();
  const { user } = useAuth();
  const { check: checkRateLimit } = useGenerationRateLimit(user?.id);
  const { subscribe, cleanup } = useGenerationSubscription();

  const generate = useCallback(async (options: GenerationRequest): Promise<GenerationResult> => {
    // 1. Validation
    const validation = validate(options);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // 2. Rate limiting
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      return {
        success: false,
        errors: [rateLimit.message!],
      };
    }

    // 3. Sanitization
    const sanitized: GenerationRequest = {
      ...options,
      prompt: sanitizePrompt(options.prompt),
      title: options.title ? sanitizeTitle(options.title) : undefined,
      lyrics: options.lyrics ? sanitizeLyrics(options.lyrics) : undefined,
      provider: options.provider || provider,
    };

    setIsGenerating(true);
    setError(null);

    try {
      // 4. API call
      const result = await GenerationService.generate(sanitized);

      if (!result.success || !result.trackId) {
        setError(new Error(result.error || 'Generation failed'));
        return { success: false, errors: [result.error || 'Generation failed'] };
      }

      // 5. Setup subscription
      subscribe(result.trackId, (payload) => {
        const track = payload.new;
        if (track.status === 'completed' || track.status === 'failed') {
          onSuccess?.(track.id);
          cleanup();
          setIsGenerating(false);
        }
      });

      return { success: true, trackId: result.trackId };
    } catch (err) {
      const error = err as Error;
      setError(error);
      return {
        success: false,
        errors: [error.message],
      };
    }
  }, [validate, checkRateLimit, subscribe, cleanup, onSuccess, provider, setIsGenerating, setError]);

  return {
    generate,
    isGenerating,
    error,
    cleanup,
  };
};
