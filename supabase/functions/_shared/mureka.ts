/**
 * @fileoverview Mureka AI API Client
 * @description
 * Централизованный клиент для взаимодействия с Mureka AI API.
 * Поддерживает генерацию музыки, текстов, расширение треков, 
 * распознавание песен, AI-описание, разделение на стемы и управление файлами.
 * 
 * @see https://platform.mureka.ai/docs/en/quickstart.html
 * @see https://platform.mureka.ai/docs/en/ai-music-o1-moment.html
 * 
 * @module mureka
 * @version 1.0.0
 * @since 2025-10-17
 * 
 * @example
 * ```typescript
 * const client = createMurekaClient({ apiKey: MUREKA_API_KEY });
 * const result = await client.generateSong({ prompt: "Epic orchestral" });
 * ```
 */

import { logger } from "./logger.ts";

// ============================================================================
// MUSIC GENERATION TYPES
// ============================================================================

/**
 * Payload для генерации музыки через Mureka AI
 * @interface MurekaGenerationPayload
 */
export interface MurekaGenerationPayload {
  /** Текст песни (ОБЯЗАТЕЛЬНО согласно API) */
  lyrics: string;
  /** Промпт для контроля генерации музыки (опционально) */
  prompt?: string;
  /** Модель: auto | mureka-6 | mureka-7.5 | mureka-o1 */
  model?: string;
  /** Количество треков (2-3, по умолчанию 2) */
  n?: number;
  /** ID референсного аудио из /v1/files/upload (опционально) */
  reference_id?: string;
  /** ID голоса из /v1/files/upload (опционально) */
  vocal_id?: string;
  /** ID мелодии из /v1/files/upload (опционально) */
  melody_id?: string;
  /** Включить streaming режим (опционально) */
  stream?: boolean;
}

/**
 * Ответ API при генерации музыки
 * @interface MurekaGenerationResponse
 */
export interface MurekaGenerationResponse {
  /** Код ответа (200 = успех) */
  code: number;
  /** Сообщение от API */
  msg: string;
  /** Данные задачи */
  data: {
    /** ID задачи для отслеживания */
    task_id: string;
    /** Статус задачи */
    status: 'pending' | 'processing' | 'completed' | 'failed';
    /** Массив сгенерированных треков (после завершения) */
    clips?: MurekaTrack[];
  };
}

/**
 * Сгенерированный трек от Mureka AI
 * @interface MurekaTrack
 */
export interface MurekaTrack {
  /** Уникальный ID трека в Mureka */
  id: string;
  /** URL аудиофайла */
  audio_url: string;
  /** URL обложки (опционально) */
  image_url?: string;
  /** URL видеоклипа (опционально) */
  video_url?: string;
  /** Название трека */
  title: string;
  /** Текст песни */
  lyrics?: string;
  /** Продолжительность в секундах */
  duration: number;
  /** Дата создания (ISO 8601) */
  created_at: string;
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// LYRICS TYPES
// ============================================================================

/**
 * Payload для генерации текста песни
 * @interface MurekaLyricsGenerationPayload
 */
export interface MurekaLyricsGenerationPayload {
  /** Описание желаемого текста */
  prompt: string;
  /** URL для callback (опционально) */
  callBackUrl?: string;
}

/**
 * Payload для расширения существующего текста
 * @interface MurekaLyricsExtensionPayload
 */
export interface MurekaLyricsExtensionPayload {
  /** Существующий текст для продолжения (обязательно) */
  lyrics: string;
  /** Дополнительные инструкции для продолжения (опционально) */
  prompt?: string;
  /** URL для callback (опционально) */
  callBackUrl?: string;
}

/**
 * Ответ API при генерации/расширении текста
 * @interface MurekaLyricsResponse
 */
export interface MurekaLyricsResponse {
  code: number;
  msg: string;
  data: {
    task_id?: string;
    /** Массив вариантов лирики (API возвращает несколько вариантов) */
    data?: Array<{
      text: string;
      title?: string;
      status?: string;
      errorMessage?: string;
    }>;
  };
}

// ============================================================================
// SONG RECOGNITION TYPES (Shazam-подобная функция)
// ============================================================================

/**
 * Payload для распознавания песни
 * @interface MurekaSongRecognitionPayload
 */
export interface MurekaSongRecognitionPayload {
  /** ID аудиофайла из /v1/files/upload (обязательно) */
  audio_file: string;
}

/**
 * Ответ API при распознавании песни
 * @interface MurekaRecognitionResponse
 */
export interface MurekaRecognitionResponse {
  code: number;
  msg: string;
  data: {
    task_id: string;
    /** Результат распознавания */
    result?: {
      /** Название песни */
      title: string;
      /** Исполнитель */
      artist: string;
      /** Альбом (опционально) */
      album?: string;
      /** Дата релиза (опционально) */
      release_date?: string;
      /** Уверенность распознавания (0-1) */
      confidence: number;
      /** Внешние ID (Spotify, Apple Music и т.д.) */
      external_ids?: {
        spotify?: string;
        apple_music?: string;
      };
    };
  };
}

// ============================================================================
// SONG DESCRIPTION TYPES (AI-анализ трека)
// ============================================================================

/**
 * Payload для AI-описания трека
 * @interface MurekaSongDescriptionPayload
 */
export interface MurekaSongDescriptionPayload {
  /** ID аудиофайла из /v1/files/upload (обязательно) */
  audio_file: string;
}

/**
 * Ответ API при AI-анализе трека
 * @interface MurekaDescriptionResponse
 */
export interface MurekaDescriptionResponse {
  code: number;
  msg: string;
  data: {
    task_id: string;
    /** Результат анализа */
    description?: {
      /** AI-генерированное описание */
      text: string;
      /** Определенный жанр */
      genre: string;
      /** Настроение */
      mood: string;
      /** Обнаруженные инструменты */
      instruments: string[];
      /** Темп (BPM) */
      tempo_bpm?: number;
      /** Тональность */
      key?: string;
      /** Уровень энергии (0-100) */
      energy_level?: number;
      /** Танцевальность (0-100) */
      danceability?: number;
      /** Валентность/позитивность (0-100) */
      valence?: number;
    };
  };
}

// ============================================================================
// BILLING TYPES
// ============================================================================

/**
 * Ответ API при запросе информации о балансе
 * @interface MurekaBillingResponse
 */
export interface MurekaBillingResponse {
  code: number;
  msg: string;
  data: {
    /** Остаток кредитов */
    balance: number;
    /** Валюта */
    currency: string;
    /** Всего потрачено (опционально) */
    total_spent?: number;
    /** Дата последнего пополнения (опционально) */
    last_topped_up?: string;
  };
}

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

/**
 * Ответ API при загрузке файла
 * @interface MurekaFileUploadResponse
 */
export interface MurekaFileUploadResponse {
  code: number;
  msg: string;
  data: {
    /** ID файла для использования в других запросах */
    file_id: string;
    /** URL загруженного файла (опционально) */
    file_url?: string;
    /** Размер файла в байтах */
    file_size: number;
    /** Дата загрузки (ISO 8601) */
    uploaded_at: string;
  };
}

// ============================================================================
// CLIENT OPTIONS
// ============================================================================

/**
 * Опции для создания Mureka клиента
 * @interface CreateMurekaClientOptions
 */
export interface CreateMurekaClientOptions {
  /** API ключ Mureka (обязательно) */
  apiKey: string;
  /** Базовый URL API (опционально, по умолчанию: https://api.mureka.ai) */
  baseUrl?: string;
  /** Таймаут запроса в миллисекундах (по умолчанию: 30000) */
  timeout?: number;
  /** Максимальное количество повторов при ошибках (по умолчанию: 3) */
  retryAttempts?: number;
  /** Кастомные эндпоинты (опционально) */
  generateEndpoint?: string;
  lyricsGenerateEndpoint?: string;
  lyricsExtendEndpoint?: string;
  recognizeEndpoint?: string;
  describeEndpoint?: string;
  billingEndpoint?: string;
  uploadEndpoint?: string;
  queryEndpoint?: string;
}

/**
 * Кастомная ошибка Mureka API
 * @class MurekaApiError
 * @extends Error
 */
export class MurekaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'MurekaApiError';
  }
}

// ============================================================================
// CLIENT FACTORY
// ============================================================================

/**
 * Создает клиент для взаимодействия с Mureka AI API
 * 
 * @param {CreateMurekaClientOptions} options - Опции клиента
 * @returns {Object} Клиент с методами для работы с Mureka API
 * 
 * @example
 * ```typescript
 * const client = createMurekaClient({
 *   apiKey: process.env.MUREKA_API_KEY,
 *   timeout: 60000,
 *   retryAttempts: 5
 * });
 * 
 * // Генерация музыки
 * const track = await client.generateSong({
 *   prompt: "Uplifting electronic music",
 *   title: "Digital Dreams",
 *   duration: 120
 * });
 * 
 * // Распознавание песни
 * const recognition = await client.recognizeSong({
 *   audio_file: uploadedFileId
 * });
 * ```
 */
export function createMurekaClient(options: CreateMurekaClientOptions) {
  const BASE_URL = options.baseUrl || "https://api.mureka.ai";
  const TIMEOUT = options.timeout || 30000;
  const MAX_RETRIES = options.retryAttempts || 3;
  
  const headers = {
    "Authorization": `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
  };

  /**
   * Вспомогательная функция для выполнения HTTP-запросов с retry-логикой
   * 
   * @template T - Тип ожидаемого ответа
   * @param {string} endpoint - Путь эндпоинта
   * @param {'GET'|'POST'} method - HTTP метод
   * @param {Record<string, unknown>} [body] - Тело запроса
   * @returns {Promise<T>} Распарсенный JSON ответ
   * @throws {MurekaApiError} При ошибках API
   * 
   * @private
   */
  async function makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, unknown> | unknown
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        
        logger.debug(`🔵 [MUREKA] Request attempt ${attempt}/${MAX_RETRIES}`, {
          endpoint,
          method,
          hasBody: !!body
        });
        
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new MurekaApiError(
            `Mureka API error (${response.status}): ${errorBody}`,
            response.status,
            errorBody
          );
        }
        
        const result = await response.json();
        
        logger.debug(`✅ [MUREKA] Request successful`, {
          endpoint,
          attempt,
          statusCode: result.code
        });
        
        return result as T;
      } catch (error) {
        lastError = error as Error;
        
        const is429 = error instanceof MurekaApiError && error.statusCode === 429;
        
        logger.warn(`⚠️ [MUREKA] Attempt ${attempt}/${MAX_RETRIES} failed`, {
          error: lastError.message,
          endpoint,
          is429RateLimit: is429,
          willRetry: attempt < MAX_RETRIES
        });
        
        if (attempt < MAX_RETRIES) {
          // For 429 rate limits: longer backoff (2s, 5s, 10s) with jitter
          const backoffMs = is429 
            ? (2000 * Math.pow(2, attempt - 1)) + Math.random() * 1000
            : (1000 * Math.pow(2, attempt - 1)); // Normal errors: 1s, 2s, 4s
          
          logger.info(`⏳ [MUREKA] Waiting ${Math.round(backoffMs)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else if (is429) {
          // All retries exhausted on 429: provide helpful error
          throw new MurekaApiError(
            'Mureka API rate limit exceeded. Please wait before retrying. (Concurrent request limit: 1)',
            429,
            lastError.message
          );
        }
      }
    }
    
    logger.error(`🔴 [MUREKA] All retry attempts failed`, {
      endpoint,
      error: lastError?.message
    });
    
    throw lastError || new Error('Mureka API request failed');
  }

  return {
    // ========================================================================
    // MUSIC GENERATION
    // ========================================================================
    
    /**
     * Генерация музыки через Mureka AI
     * 
     * @param {MurekaGenerationPayload} payload - Параметры генерации
     * @returns {Promise<MurekaGenerationResponse>} Результат с task_id
     * 
     * @example
     * ```typescript
     * const result = await client.generateSong({
     *   lyrics: "Verse 1:\nWalking down...\n\nChorus:\nI'm free...",
     *   prompt: "upbeat pop song",
     *   model: "auto",
     *   n: 2
     * });
     * console.log(`Task ID: ${result.data.task_id}`);
     * ```
     */
    async generateSong(payload: MurekaGenerationPayload): Promise<MurekaGenerationResponse> {
      logger.info('🎵 [MUREKA] Generating song', { 
        lyricsLength: payload.lyrics?.length,
        prompt: payload.prompt?.substring(0, 50),
        model: payload.model
      });
      
      return makeRequest(
        options.generateEndpoint || '/v1/song/generate',
        'POST',
        payload
      );
    },

    /**
     * Расширение существующей композиции
     * (Функция устарела - используйте /v1/song/generate с правильными параметрами)
     * 
     * @deprecated
     */
    async extendSong(payload: any): Promise<MurekaGenerationResponse> {
      logger.warn('⚠️ [MUREKA] extendSong deprecated - use generateSong instead');
      
      return makeRequest(
        options.generateEndpoint || '/v1/song/extend',
        'POST',
        payload
      );
    },

    // ========================================================================
    // LYRICS GENERATION
    // ========================================================================
    
    /**
     * Генерация текста песни
     * 
     * @param {MurekaLyricsGenerationPayload} payload - Параметры генерации
     * @returns {Promise<MurekaLyricsResponse>} Результат с task_id
     * 
     * @example
     * ```typescript
     * const result = await client.generateLyrics({
     *   prompt: "Song about summer and freedom"
     * });
     * ```
     */
    async generateLyrics(payload: MurekaLyricsGenerationPayload): Promise<MurekaLyricsResponse> {
      logger.info('📝 [MUREKA] Generating lyrics', { 
        prompt: payload.prompt?.substring(0, 50)
      });
      
      return makeRequest(
        options.lyricsGenerateEndpoint || '/v1/lyrics/generate',
        'POST',
        payload
      );
    },

    /**
     * Расширение существующего текста песни
     * 
     * @param {MurekaLyricsExtensionPayload} payload - Параметры расширения
     * @returns {Promise<MurekaLyricsResponse>} Результат с task_id
     * 
     * @example
     * ```typescript
     * const result = await client.extendLyrics({
     *   lyrics: "Verse 1: Walking down the street...",
     *   prompt: "Add chorus about hope and dreams"
     * });
     * ```
     */
    async extendLyrics(payload: MurekaLyricsExtensionPayload): Promise<MurekaLyricsResponse> {
      logger.info('📝➕ [MUREKA] Extending lyrics', { 
        existingLength: payload.lyrics?.length
      });
      
      return makeRequest(
        options.lyricsExtendEndpoint || '/v1/lyrics/extend',
        'POST',
        payload
      );
    },

    // ========================================================================
    // FILE UPLOAD
    // ========================================================================
    
    /**
     * Загрузка аудиофайла для использования в других операциях
     * 
     * @param {Blob} file - Аудиофайл для загрузки
     * @returns {Promise<MurekaFileUploadResponse>} Результат с file_id
     * 
     * @example
     * ```typescript
     * const audioBlob = await fetch(audioUrl).then(r => r.blob());
     * const upload = await client.uploadFile(audioBlob);
     * console.log(`File ID: ${upload.data.file_id}`);
     * ```
     */
    async uploadFile(file: Blob): Promise<MurekaFileUploadResponse> {
      logger.info('📤 [MUREKA] Uploading file', { size: file.size });
      
      const formData = new FormData();
      // ✅ CRITICAL FIX: Create Blob with explicit MIME type and filename
      // Mureka API requires proper file format identification
      const audioBlob = new Blob([file], { type: 'audio/mpeg' });
      formData.append('file', audioBlob, 'audio.mp3'); // Add explicit filename
      // ✅ REQUIRED by Mureka API: specify purpose. Using generic 'audio' for analysis/recognition.
      formData.append('purpose', 'audio');
      
      const url = `${BASE_URL}${options.uploadEndpoint || '/v1/files/upload'}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new MurekaApiError(
          `File upload failed (${response.status}): ${errorBody}`,
          response.status,
          errorBody
        );
      }
      
      const result = await response.json();
      
      logger.info('✅ [MUREKA] File uploaded', { 
        file_id: result.data?.file_id,
        file_size: result.data?.file_size
      });
      
      return result;
    },

    // ========================================================================
    // SONG RECOGNITION (Shazam-подобная функция)
    // ========================================================================
    
    /**
     * Распознавание песни по аудиофайлу (Shazam-like)
     * 
     * @param {MurekaSongRecognitionPayload} payload - ID загруженного файла
     * @returns {Promise<MurekaRecognitionResponse>} Результат распознавания
     * 
     * @example
     * ```typescript
     * const result = await client.recognizeSong({
     *   audio_file: uploadedFileId
     * });
     * 
     * if (result.data.result) {
     *   console.log(`Recognized: ${result.data.result.title} - ${result.data.result.artist}`);
     *   console.log(`Confidence: ${result.data.result.confidence * 100}%`);
     * }
     * ```
     */
    async recognizeSong(payload: MurekaSongRecognitionPayload): Promise<MurekaRecognitionResponse> {
      logger.info('🔍 [MUREKA] Recognizing song', { 
        file_id: payload.audio_file 
      });
      
      return makeRequest(
        options.recognizeEndpoint || '/v1/song/recognize',
        'POST',
        payload
      );
    },

    // ========================================================================
    // SONG DESCRIPTION (AI-анализ трека)
    // ========================================================================
    
    /**
     * AI-анализ и описание трека
     * 
     * @param {MurekaSongDescriptionPayload} payload - ID загруженного файла
     * @returns {Promise<MurekaDescriptionResponse>} AI-описание трека
     * 
     * @example
     * ```typescript
     * const result = await client.describeSong({
     *   audio_file: uploadedFileId
     * });
     * 
     * if (result.data.description) {
     *   console.log(`Genre: ${result.data.description.genre}`);
     *   console.log(`Mood: ${result.data.description.mood}`);
     *   console.log(`BPM: ${result.data.description.tempo_bpm}`);
     * }
     * ```
     */
    async describeSong(payload: MurekaSongDescriptionPayload): Promise<MurekaDescriptionResponse> {
      logger.info('📖 [MUREKA] Describing song', { 
        file_id: payload.audio_file 
      });
      
      return makeRequest(
        options.describeEndpoint || '/v1/song/describe',
        'POST',
        payload
      );
    },

    // ========================================================================
    // BILLING
    // ========================================================================
    
    /**
     * Получение информации о балансе аккаунта
     * 
     * @returns {Promise<MurekaBillingResponse>} Информация о кредитах
     * 
     * @example
     * ```typescript
     * const billing = await client.getBilling();
     * console.log(`Balance: ${billing.data.balance} ${billing.data.currency}`);
     * ```
     */
    async getBilling(): Promise<MurekaBillingResponse> {
      logger.info('💰 [MUREKA] Fetching billing info');
      
      return makeRequest(
        options.billingEndpoint || '/v1/account/billing',
        'GET'
      );
    },

    // ========================================================================
    // TASK QUERY
    // ========================================================================
    
    /**
     * Проверка статуса задачи
     * 
     * @param {string} taskId - ID задачи
     * @returns {Promise<MurekaGenerationResponse>} Статус и результаты
     * 
     * @example
     * ```typescript
     * const status = await client.queryTask(taskId);
     * 
     * if (status.data.status === 'completed' && status.data.clips) {
     *   console.log('Generation completed!');
     *   status.data.clips.forEach(clip => {
     *     console.log(`Track: ${clip.title}, URL: ${clip.audio_url}`);
     *   });
     * }
     * ```
     */
    async queryTask(taskId: string): Promise<MurekaGenerationResponse> {
      logger.info('🔄 [MUREKA] Querying task', { taskId });
      
      const endpoint = options.queryEndpoint || '/v1/song/query';
      const url = endpoint.replace('{task_id}', taskId) || `${endpoint}/${taskId}`;
      
      return makeRequest(url, 'GET');
    },

    // ========================================================================
    // STEM SEPARATION
    // ========================================================================
    
    /**
     * Разделение трека на стемы (инструменты)
     * 
     * @param {Object} payload - ID аудиофайла
     * @returns {Promise<any>} Результат разделения
     * 
     * @example
     * ```typescript
     * const result = await client.separateStems({
     *   audio_file: uploadedFileId
     * });
     * ```
     */
    async separateStems(payload: { audio_file: string }): Promise<any> {
      logger.info('🎚️ [MUREKA] Separating stems', { 
        file_id: payload.audio_file 
      });
      
      return makeRequest('/v1/song/stem', 'POST', payload);
    },
  };
}
