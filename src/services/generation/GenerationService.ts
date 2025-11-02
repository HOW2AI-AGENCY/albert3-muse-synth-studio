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
import { performanceMonitor } from '@/utils/performanceMonitor';
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
  weirdnessConstraint?: number;
  
  // Optional
  customMode?: boolean;
  isBGM?: boolean;
  idempotencyKey?: string;
  
  // ✅ Force new generation (skip cache)
  forceNew?: boolean;
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
const REQUEST_CACHE_SIZE = 10; // Cache last 10 requests
const REQUEST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ============= Request Cache =============

interface CachedRequest {
  hash: string;
  trackId: string;
  timestamp: number;
}

const requestCache = new Map<string, CachedRequest>();

/**
 * Генерация хеша запроса для дедупликации
 * ✅ UTF-8 safe: поддерживает кириллицу и любые Unicode символы
 */
function generateRequestHash(request: GenerationRequest): string {
  const { prompt, lyrics, styleTags, provider, hasVocals, modelVersion } = request;
  const normalized = JSON.stringify({
    prompt: prompt.trim().toLowerCase(),
    lyrics: lyrics?.trim().toLowerCase() || '',
    tags: [...(styleTags || [])].sort().join(','),
    provider,
    hasVocals: hasVocals ?? true,
    model: modelVersion || 'default',
  });
  
  // ✅ UTF-8 безопасное кодирование (поддержка кириллицы)
  try {
    const utf8Bytes = new TextEncoder().encode(normalized);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString).substring(0, 32);
  } catch (error) {
    // Fallback: простой хеш если btoa всё равно не работает
    logger.warn('Hash generation fallback', 'GenerationService', { error });
    return `${normalized.length}_${normalized.substring(0, 16).replace(/[^a-zA-Z0-9]/g, '')}`;
  }
}

/**
 * Проверка дублирующих запросов
 */
function checkDuplicateRequest(request: GenerationRequest): string | null {
  // ✅ Skip cache if forceNew flag is set
  if (request.forceNew) {
    logger.info('Skipping duplicate check - forceNew flag enabled', 'GenerationService');
    return null;
  }
  
  const hash = generateRequestHash(request);
  const cached = requestCache.get(hash);
  
  if (cached && Date.now() - cached.timestamp < REQUEST_CACHE_TTL) {
    logger.info('Duplicate request detected', 'GenerationService', { 
      hash, 
      cachedTrackId: cached.trackId,
      age: Math.floor((Date.now() - cached.timestamp) / 1000),
    });
    return cached.trackId;
  }
  
  return null;
}

/**
 * Кеширование запроса
 */
function cacheRequest(request: GenerationRequest, trackId: string): void {
  const hash = generateRequestHash(request);
  requestCache.set(hash, { hash, trackId, timestamp: Date.now() });
  
  // Очистка старых записей
  if (requestCache.size > REQUEST_CACHE_SIZE) {
    const sortedEntries = Array.from(requestCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    requestCache.delete(sortedEntries[0][0]);
  }
}

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
    // ✅ Generate Correlation ID for end-to-end tracing
    const correlationId = crypto.randomUUID();
    const context = 'GenerationService.generate';
    
    logger.info('🎵 [GENERATION START] Starting music generation', context, {
      correlationId,
      provider: request.provider,
      prompt: request.prompt.substring(0, 50) + '...',
      promptLength: request.prompt.length,
      hasLyrics: !!request.lyrics,
      lyricsLength: request.lyrics?.length || 0,
      customMode: request.customMode,
      styleTags: request.styleTags,
      modelVersion: request.modelVersion,
      isCyrillic: /[А-Яа-яЁё]/.test(request.prompt),
    });

    // 1. Валидация запроса
    logger.debug('[STEP 1] Validating request...', context);
    const validationError = validateGenerationRequest(request);
    if (validationError) {
      logger.error('[STEP 1 FAILED] Validation failed', new Error(validationError.message), context, {
        errorCode: validationError.code,
        errorMessage: validationError.message,
        promptLength: request.prompt.length,
        lyricsLength: request.lyrics?.length || 0,
      });
      throw new Error(validationError.message);
    }
    logger.info('[STEP 1 ✓] Validation passed', context);

    // 2. Проверка аутентификации
    logger.debug('[STEP 2] Checking authentication...', context);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('[STEP 2 FAILED] Authentication failed', authError || new Error('No user'), context, {
        hasAuthError: !!authError,
        hasUser: !!user,
      });
      throw new Error('Требуется авторизация');
    }
    logger.info('[STEP 2 ✓] User authenticated', context, { userId: user.id });

    // 3. ✅ SECURITY: Проверка rate limiting
    logger.debug('[STEP 3] Checking rate limit...', context);
    try {
      const { generationRateLimiter } = await import('@/middleware/rateLimiter');
      const rateLimitResult = await generationRateLimiter.check();
      
      if (!rateLimitResult.allowed) {
        const waitTime = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
        const errorMsg = `Слишком много запросов. Подождите ${waitTime} секунд.`;
        
        logger.warn('[STEP 3 FAILED] Rate limit exceeded', context, {
          userId: user.id,
          remaining: rateLimitResult.remaining,
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
          waitTime,
        });
        
        throw new Error(errorMsg);
      }
      
      logger.info('[STEP 3 ✓] Rate limit check passed', context, {
        remaining: rateLimitResult.remaining,
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Слишком много запросов')) {
        throw error;
      }
      // Rate limiter initialization failed, continue without it (log warning)
      logger.warn('[STEP 3] Rate limiter unavailable, continuing', context, { error });
    }

    // 4. ✅ Проверка дублирующих запросов
    logger.debug('[STEP 4] Checking for duplicate requests...', context);
    const cachedId = checkDuplicateRequest(request);
    if (cachedId) {
      // Проверяем, что кэшированный трек действительно завершён
      const { data: cachedTrack } = await supabase
        .from('tracks')
        .select('status')
        .eq('id', cachedId)
        .maybeSingle();

      if (cachedTrack?.status === 'completed') {
        logger.info('⚡ Returning cached COMPLETED track', context, { trackId: cachedId });
        return {
          success: true,
          trackId: cachedId,
          taskId: 'cached',
          provider: request.provider,
          message: 'Используется ранее созданный трек',
        };
      }

      logger.warn('Cached track is not completed. Ignoring cache and generating new', context, {
        trackId: cachedId,
        status: cachedTrack?.status || 'unknown',
      });
    }

    logger.info('[STEP 3 ✓] No duplicate found, proceeding with generation', context);

    try {
      // 4. Создание записи трека
      logger.debug('[STEP 4] Creating track record in database...', context);
      const trackId = await createTrackRecord(user.id, request);
      logger.info('[STEP 4 ✓] Track record created', context, { trackId });

      // 5. ✅ Кеширование запроса
      cacheRequest(request, trackId);

      // 6. ✅ Начать мониторинг производительности
      const performanceId = `generation-${trackId}`;
      performanceMonitor.startTimer(performanceId, 'GenerationService');

      // 7. Вызов Edge Function напрямую
      logger.info('[STEP 5] Invoking provider edge function', context, {
        correlationId,
        provider: request.provider,
        trackId,
      });

      const functionName = request.provider === 'suno' ? 'generate-suno' : 'generate-mureka';
      const { data: result, error: invokeError } = await supabase.functions.invoke(functionName, {
        body: { ...request, trackId, correlationId }
      });

      if (invokeError || !result) {
        throw new Error(invokeError?.message || 'Provider invocation failed');
      }
      
      logger.info('[STEP 5 ✓] Provider responded successfully', context, {
        correlationId,
        provider: request.provider,
        trackId,
        taskId: result.taskId,
      });

      // ✅ Записать метрику вызова провайдера
      performanceMonitor.endTimer(
        performanceId, 
        `generation.provider.${request.provider}`,
        'GenerationService',
        {
          trackId,
          hasLyrics: !!request.lyrics,
          customMode: request.customMode,
        }
      );

      logger.info('✅ [GENERATION SUCCESS] All steps completed', context, {
        correlationId,
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
      logger.error('❌ [GENERATION FAILED] Error occurred', error instanceof Error ? error : new Error(String(error)), context, {
        correlationId,
        provider: request.provider,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
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
