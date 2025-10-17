/**
 * Generation Service - Унифицированный сервис для генерации музыки
 * 
 * Централизует всю логику генерации музыки, включая:
 * - Валидацию запросов
 * - Создание треков в БД
 * - Маршрутизацию к нужному провайдеру
 * - Обработку ошибок
 * - Real-time подписки
 * 
 * @module GenerationService
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { generateMusic as routeToProvider } from '@/services/providers/router';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Re-export unified MusicProvider type
export type { MusicProvider } from '@/config/provider-models';

// ============= Types =============

export interface GenerationRequest {
  // Basic params
  title?: string;
  prompt: string;
  provider: import('@/config/provider-models').MusicProvider;

  // Music params
  lyrics?: string;
  styleTags?: string[];
  hasVocals?: boolean;
  makeInstrumental?: boolean;

  // Advanced params
  modelVersion?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f' | 'any';

  // Audio reference
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  audioWeight?: number;

  // Weights & constraints
  styleWeight?: number;
  lyricsWeight?: number;
  weirdness?: number;

  // Optional
  customMode?: boolean;
  isBGM?: boolean;
}

export interface GenerationResult {
  success: boolean;
  trackId: string;
  taskId: string;
  provider: import('@/config/provider-models').MusicProvider;
  message?: string;
}

export interface GenerationError {
  code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'PROVIDER_ERROR' | 'DB_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: unknown;
}

// ============= Constants =============

const MIN_PROMPT_LENGTH = 3;
const MAX_PROMPT_LENGTH = 500;
const MAX_LYRICS_LENGTH = 3000;

// ============= Validation =============

/**
 * Валидация запроса на генерацию
 */
function validateGenerationRequest(request: GenerationRequest): GenerationError | null {
  const { prompt, lyrics, provider } = request;

  // Проверка промпта
  if (!prompt || prompt.trim().length < MIN_PROMPT_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Описание должно содержать минимум ${MIN_PROMPT_LENGTH} символа`,
    };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Описание не должно превышать ${MAX_PROMPT_LENGTH} символов`,
    };
  }

  // Проверка лирики
  if (lyrics && lyrics.length > MAX_LYRICS_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Текст песни не должен превышать ${MAX_LYRICS_LENGTH} символов`,
    };
  }

  // Проверка провайдера
  if (!['suno', 'mureka'].includes(provider)) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Неподдерживаемый провайдер: ${provider}`,
    };
  }

  return null;
}

// ============= Database Operations =============

/**
 * Создание записи трека в БД
 */
async function createTrackRecord(
  userId: string,
  request: GenerationRequest
): Promise<string> {
  const { title, prompt, provider, lyrics, styleTags, hasVocals } = request;

  const effectiveTitle = title?.trim() || 'Untitled Track';

  try {
    const { data, error } = await supabase
      .from('tracks')
      .insert({
        user_id: userId,
        title: effectiveTitle,
        prompt: prompt.trim(),
        lyrics: lyrics?.trim() || null,
        style_tags: styleTags || null,
        has_vocals: hasVocals ?? true,
        provider: provider,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to create track record', error, 'GenerationService', {
        userId,
        provider,
      });
      throw new Error('Не удалось создать запись трека');
    }

    if (!data?.id) {
      throw new Error('Track ID not returned from database');
    }

    logger.info('Track record created', 'GenerationService', {
      trackId: data.id,
      userId,
      provider,
    });

    return data.id;
  } catch (error) {
    logger.error('Database error during track creation', error instanceof Error ? error : new Error(String(error)), 'GenerationService');
    throw error;
  }
}

// ============= Real-time Subscriptions =============

type StatusUpdateHandler = (status: 'completed' | 'failed', trackData?: {
  title: string;
  errorMessage?: string;
}) => void;

/**
 * Подписка на обновления статуса трека
 */
function subscribeToTrackUpdates(
  trackId: string,
  onUpdate: StatusUpdateHandler
): RealtimeChannel {
  const subscription = supabase
    .channel(`track-status:${trackId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'tracks',
      filter: `id=eq.${trackId}`,
    }, (payload) => {
      const track = payload.new as {
        status: string;
        title: string;
        error_message?: string;
      };

      if (track.status === 'completed' || track.status === 'failed') {
        onUpdate(track.status, {
          title: track.title,
          errorMessage: track.error_message,
        });
      }
    })
    .subscribe();

  logger.debug('Subscribed to track updates', 'GenerationService', { trackId });
  return subscription;
}

// ============= Main Service =============

/**
 * Основной класс GenerationService
 */
export class GenerationService {
  /**
   * Генерация музыки с полным циклом обработки
   */
  static async generate(request: GenerationRequest): Promise<GenerationResult> {
    const context = 'GenerationService.generate';
    logger.info('🎵 Starting music generation', context, {
      provider: request.provider,
      hasLyrics: !!request.lyrics,
      customMode: request.customMode,
    });

    // 1. Валидация запроса
    const validationError = validateGenerationRequest(request);
    if (validationError) {
      logger.warn('Validation failed', context, {
        errorCode: validationError.code,
        errorMessage: validationError.message,
      });
      throw new Error(validationError.message);
    }

    // 2. Проверка аутентификации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('Authentication failed', authError || new Error('No user'), context);
      throw new Error('Требуется авторизация');
    }

    try {
      // 3. Создание записи трека
      const trackId = await createTrackRecord(user.id, request);

      // 4. Подготовка параметров для провайдера
      const providerParams = {
        ...request,
        provider: request.provider,
        trackId,
        title: request.title,
        prompt: request.prompt,
        lyrics: request.lyrics,
        styleTags: request.styleTags,
        hasVocals: request.hasVocals,
        makeInstrumental: request.makeInstrumental,
        modelVersion: request.modelVersion,
        negativeTags: request.negativeTags,
        vocalGender: request.vocalGender,
        referenceAudioUrl: request.referenceAudioUrl,
        referenceTrackId: request.referenceTrackId,
        audioWeight: request.audioWeight,
        styleWeight: request.styleWeight,
        lyricsWeight: request.lyricsWeight,
        weirdness: request.weirdness,
        customMode: request.customMode,
        isBGM: request.isBGM,
      };

      // 5. Вызов провайдера
      logger.info('Invoking provider', context, {
        provider: request.provider,
        trackId,
      });

      const result = await routeToProvider(providerParams);

      logger.info('✅ Provider invoked successfully', context, {
        provider: request.provider,
        trackId,
        taskId: result.taskId,
      });

      return {
        success: true,
        trackId,
        taskId: result.taskId,
        provider: request.provider,
        message: result.message,
      };

    } catch (error) {
      logger.error('Generation failed', error instanceof Error ? error : new Error(String(error)), context, {
        provider: request.provider,
      });

      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Network errors
        if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
          throw new Error('Нет связи с сервером. Проверьте подключение к интернету.');
        }
        
        // Provider-specific errors
        if (errorMessage.includes('insufficient credits') || errorMessage.includes('no credits')) {
          throw new Error('Недостаточно кредитов для генерации. Пополните баланс.');
        }
        
        if (errorMessage.includes('invalid api key') || errorMessage.includes('unauthorized')) {
          throw new Error('Ошибка авторизации провайдера. Обратитесь в поддержку.');
        }
        
        if (errorMessage.includes('rate limit')) {
          throw new Error('Превышен лимит запросов. Попробуйте позже.');
        }
        
        if (errorMessage.includes('timeout')) {
          throw new Error('Превышено время ожидания. Попробуйте снова.');
        }
        
        // Re-throw original error if it's specific
        throw error;
      }

      throw new Error('Не удалось сгенерировать музыку. Попробуйте снова.');
    }
  }

  /**
   * Создать подписку на обновления статуса трека
   */
  static subscribe(trackId: string, onUpdate: StatusUpdateHandler): RealtimeChannel {
    return subscribeToTrackUpdates(trackId, onUpdate);
  }

  /**
   * Отменить подписку
   */
  static unsubscribe(subscription: RealtimeChannel): void {
    subscription.unsubscribe();
    logger.debug('Unsubscribed from track updates', 'GenerationService');
  }
}
