/**
 * Provider Router - Централизованная маршрутизация запросов к AI провайдерам
 * 
 * Унифицирует вызовы generate() и getBalance() для разных провайдеров (Suno, Mureka)
 * Устраняет дублирование логики между ApiService и useMusicGenerationStore
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { MusicProvider } from '@/config/provider-models';
import { retryWithBackoff, RETRY_CONFIGS } from '@/utils/retryWithBackoff';

const context = 'ProviderRouter';

export interface GenerateOptions {
  provider: MusicProvider;
  trackId?: string;
  title?: string;
  prompt: string;
  lyrics?: string;
  styleTags?: string[];
  tags?: string[];
  hasVocals?: boolean;
  makeInstrumental?: boolean;
  modelVersion?: string;
  idempotencyKey?: string;
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f' | 'any';
  styleWeight?: number;
  lyricsWeight?: number;
  weirdness?: number;
  audioWeight?: number;
  customMode?: boolean;
  isBGM?: boolean;
  weirdnessConstraint?: number;
}

export interface ProviderBalance {
  balance: number;
  currency: string;
  details?: Record<string, unknown>;
}

export interface GenerateResponse {
  success: boolean;
  taskId: string;
  trackId: string;
  message?: string;
}

/**
 * Маршрутизация генерации музыки к нужному провайдеру
 */
export const generateMusic = async (options: GenerateOptions): Promise<GenerateResponse> => {
  const { provider, ...params } = options;

  const logData: Record<string, unknown> = { 
    provider,
    promptPreview: params.prompt.substring(0, 50),
    promptLength: params.prompt.length,
    hasLyrics: !!params.lyrics,
    lyricsLength: params.lyrics?.length || 0,
    styleTagsCount: params.styleTags?.length || 0,
    isCyrillic: /[А-Яа-яЁё]/.test(params.prompt),
  };
  if (params.trackId) {
    logData.trackId = params.trackId;
  }

  logger.info('🔀 [ROUTER] Routing music generation', context, logData);

  try {
    switch (provider) {
      case 'suno': {
        const sanitizedTags = Array.isArray(params.styleTags)
          ? params.styleTags.map((tag) => tag?.trim()).filter((tag): tag is string => Boolean(tag))
          : Array.isArray(params.tags)
            ? params.tags.map((tag) => tag?.trim()).filter((tag): tag is string => Boolean(tag))
            : [];
        const lyrics = typeof params.lyrics === 'string' ? params.lyrics : undefined;
        const trimmedLyrics = lyrics?.trim();
        const effectiveLyrics = trimmedLyrics && trimmedLyrics.length > 0 ? trimmedLyrics : undefined;
        const normalizedPrompt = params.prompt?.trim() || effectiveLyrics || 'Music generation';
        const resolvedHasVocals =
          typeof params.hasVocals === 'boolean' ? params.hasVocals : undefined;
        const makeInstrumental =
          typeof params.makeInstrumental === 'boolean'
            ? params.makeInstrumental
            : resolvedHasVocals === false;
        const normalizedVocalGender =
          params.vocalGender === 'm' || params.vocalGender === 'f'
            ? params.vocalGender
            : undefined;
        const trimmedNegativeTags = params.negativeTags?.trim();
        const customMode =
          typeof params.customMode === 'boolean'
            ? params.customMode
            : effectiveLyrics !== undefined;
        const clampRatio = (value?: number) => {
          if (typeof value !== 'number' || Number.isNaN(value)) {
            return undefined;
          }
          return Math.min(Math.max(value, 0), 1);
        };
        const weirdnessConstraint =
          params.weirdness !== undefined ? clampRatio(params.weirdness) : clampRatio(params.weirdnessConstraint);

        // ✅ Validate model version for Suno (imported from provider-models.ts)
        const validatedModel = params.modelVersion || 'V5';

        const requestBody = {
          trackId: params.trackId,
          title: params.title?.trim(),
          prompt: normalizedPrompt,
          lyrics: effectiveLyrics,
          modelVersion: validatedModel,
          tags: sanitizedTags,
          make_instrumental: makeInstrumental,
          hasVocals: resolvedHasVocals,
          customMode,
          idempotencyKey: params.idempotencyKey,
          referenceAudioUrl: params.referenceAudioUrl,
          referenceTrackId: params.referenceTrackId,
          negativeTags: trimmedNegativeTags && trimmedNegativeTags.length > 0 ? trimmedNegativeTags : undefined,
          vocalGender: normalizedVocalGender,
          styleWeight: clampRatio(params.styleWeight),
          lyricsWeight: clampRatio(params.lyricsWeight),
          weirdnessConstraint,
          audioWeight: clampRatio(params.audioWeight),
        };

        logger.info('📤 [ROUTER] Invoking Suno Edge Function', context, {
          trackId: params.trackId,
          bodyPreview: {
            promptLength: requestBody.prompt.length,
            lyricsLength: requestBody.lyrics?.length || 0,
            tagsCount: requestBody.tags.length,
            customMode: requestBody.customMode,
            modelVersion: requestBody.modelVersion,
          },
        });

        const { data, error } = await retryWithBackoff(
          () => supabase.functions.invoke('generate-suno', {
            body: requestBody
          }),
          {
            ...RETRY_CONFIGS.critical,
            onRetry: (error, attempt) => {
              logger.warn(
                `Suno generation failed, retrying...`,
                context,
                {
                  attempt,
                  trackId: params.trackId,
                  error: error.message,
                }
              );
            },
          }
        );

        if (error) {
          logger.error('❌ [ROUTER] Suno Edge Function error', error, context, {
            trackId: params.trackId,
            errorDetails: error,
          });
          throw error;
        }

        logger.info('✅ [ROUTER] Suno Edge Function response received', context, {
          trackId: params.trackId,
          responsePreview: data ? Object.keys(data) : 'null',
        });

        return data as GenerateResponse;
      }

      case 'mureka': {
        const sanitizedStyleTags = Array.isArray(params.styleTags)
          ? params.styleTags.map((tag) => tag?.trim()).filter((tag): tag is string => Boolean(tag))
          : [];
        const resolvedHasVocals =
          typeof params.hasVocals === 'boolean' ? params.hasVocals : undefined;
        const makeInstrumental =
          typeof params.makeInstrumental === 'boolean'
            ? params.makeInstrumental
            : resolvedHasVocals === false || params.isBGM === true;
        const hasVocals = resolvedHasVocals !== undefined ? resolvedHasVocals : !makeInstrumental;
        const isBGM =
          typeof params.isBGM === 'boolean' ? params.isBGM : makeInstrumental ? true : undefined;

        // ✅ Validate model version for Mureka (imported from provider-models.ts)
        const validatedModel = params.modelVersion || 'auto';

        const requestBodyMureka = {
          trackId: params.trackId,
          title: params.title?.trim(),
          prompt: params.prompt,
          lyrics: params.lyrics,
          styleTags: sanitizedStyleTags.length > 0 ? sanitizedStyleTags : undefined,
          modelVersion: validatedModel,
          hasVocals,
          isBGM,
          idempotencyKey: params.idempotencyKey,
        };

        logger.info('📤 [ROUTER] Invoking Mureka Edge Function', context, {
          trackId: params.trackId,
          bodyPreview: {
            promptLength: requestBodyMureka.prompt.length,
            lyricsLength: requestBodyMureka.lyrics?.length || 0,
            styleTagsCount: requestBodyMureka.styleTags?.length || 0,
            hasVocals: requestBodyMureka.hasVocals,
            isBGM: requestBodyMureka.isBGM,
          },
        });

        const { data, error } = await retryWithBackoff(
          () => supabase.functions.invoke('generate-mureka', {
            body: requestBodyMureka
          }),
          {
            ...RETRY_CONFIGS.critical,
            onRetry: (error, attempt) => {
              logger.warn(
                `Mureka generation failed, retrying...`,
                context,
                {
                  attempt,
                  trackId: params.trackId,
                  error: error.message,
                }
              );
            },
          }
        );

        if (error) {
          logger.error('❌ [ROUTER] Mureka Edge Function error', error, context, {
            trackId: params.trackId,
            errorDetails: error,
          });
          throw error;
        }

        logger.info('✅ [ROUTER] Mureka Edge Function response received', context, {
          trackId: params.trackId,
          responsePreview: data ? Object.keys(data) : 'null',
        });

        return data as GenerateResponse;
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    const errorData: Record<string, unknown> = { provider };
    if (params.trackId) {
      errorData.trackId = params.trackId;
    }

    logger.error(
      'Provider router generation error',
      error instanceof Error ? error : new Error(String(error)),
      context,
      errorData,
    );
    throw error;
  }
};

/**
 * Маршрутизация получения баланса к нужному провайдеру
 */
export const getProviderBalance = async (provider: MusicProvider): Promise<ProviderBalance> => {
  logger.info('Routing balance request', context, { provider });

  try {
    switch (provider) {
      case 'suno': {
        const { data, error } = await retryWithBackoff(
          () => supabase.functions.invoke('get-balance', {}),
          RETRY_CONFIGS.fast
        );

        if (error) throw error;
        
        return {
          balance: data?.balance ?? 0,
          currency: data?.currency || 'USD',
          details: data,
        };
      }

      case 'mureka': {
        const { data, error } = await retryWithBackoff(
          () => supabase.functions.invoke('get-mureka-balance', {}),
          RETRY_CONFIGS.fast
        );

        if (error) throw error;

        return {
          balance: data?.balance ?? 0,
          currency: data?.currency || 'CNY',
          details: data,
        };
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    logger.error(
      'Provider router balance error',
      error instanceof Error ? error : new Error(String(error)),
      context,
      { provider },
    );
    throw error;
  }
};

/**
 * Проверка доступности провайдера
 */
export const isProviderAvailable = async (provider: MusicProvider): Promise<boolean> => {
  try {
    const balance = await getProviderBalance(provider);
    return balance.balance > 0;
  } catch (error) {
    const warnData: Record<string, unknown> = {
      provider,
      error: error instanceof Error ? error.message : String(error),
    };

    logger.warn('Provider availability check failed', context, warnData);
    return false;
  }
};
