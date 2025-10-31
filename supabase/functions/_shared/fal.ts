/**
 * @fileoverview Fal.AI API Client for Audio Understanding
 * @description
 * Клиент для работы с Fal.AI Audio Understanding API.
 * Поддерживает распознавание песен и AI-анализ аудио через queue-based систему.
 * 
 * @see https://fal.ai/models/fal-ai/audio-understanding
 * @see https://fal.ai/models/fal-ai/audio-understanding/api
 * 
 * @module fal
 * @version 1.0.0
 * @since 2025-10-31
 * 
 * @example
 * ```typescript
 * const client = createFalClient({ apiKey: FAL_API_KEY });
 * const result = await client.analyzeAudio({
 *   audioUrl: 'https://example.com/audio.mp3',
 *   prompt: 'Extract song title, artist, genre, mood, BPM, instruments'
 * });
 * ```
 */

import { logger } from "./logger.ts";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Статусы задачи в очереди Fal.AI
 */
export type FalQueueStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Payload для анализа аудио через Fal.AI
 */
export interface FalAudioAnalysisPayload {
  /** URL аудиофайла для анализа */
  audio_url: string;
  /** Промпт с инструкциями для AI */
  prompt: string;
  /** Запросить детальный анализ (опционально) */
  detailed_analysis?: boolean;
}

/**
 * Ответ API при запуске задачи
 */
export interface FalQueueResponse {
  /** Статус задачи */
  status: FalQueueStatus;
  /** ID запроса для отслеживания */
  request_id: string;
  /** URL для получения результата */
  response_url?: string;
  /** URL для проверки статуса */
  status_url?: string;
  /** URL для отмены задачи */
  cancel_url?: string;
  /** Логи выполнения */
  logs?: Array<{ message: string; timestamp: number }>;
  /** Метрики выполнения */
  metrics?: Record<string, unknown>;
  /** Позиция в очереди */
  queue_position?: number;
}

/**
 * Результат анализа аудио
 */
export interface FalAudioAnalysisResult {
  /** AI-генерированный текст с результатами анализа */
  output: string;
}

/**
 * Кастомная ошибка Fal.AI API
 */
export class FalApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'FalApiError';
  }
}

/**
 * Опции для создания Fal.AI клиента
 */
export interface CreateFalClientOptions {
  /** API ключ Fal.AI (обязательно) */
  apiKey: string;
  /** Базовый URL API (по умолчанию: https://queue.fal.run) */
  baseUrl?: string;
  /** Таймаут запроса в миллисекундах (по умолчанию: 30000) */
  timeout?: number;
  /** Максимальное количество повторов при ошибках (по умолчанию: 3) */
  retryAttempts?: number;
}

// ============================================================================
// CLIENT FACTORY
// ============================================================================

/**
 * Создает клиент для взаимодействия с Fal.AI Audio Understanding API
 * 
 * @param {CreateFalClientOptions} options - Опции клиента
 * @returns {Object} Клиент с методами для работы с Fal.AI API
 * 
 * @example
 * ```typescript
 * const client = createFalClient({
 *   apiKey: process.env.FAL_API_KEY,
 *   timeout: 60000
 * });
 * 
 * // Запуск анализа
 * const task = await client.startAnalysis({
 *   audio_url: 'https://example.com/track.mp3',
 *   prompt: 'Extract: title, artist, genre, mood, BPM'
 * });
 * 
 * // Проверка статуса
 * const status = await client.checkStatus(task.request_id);
 * 
 * // Получение результата
 * if (status.status === 'COMPLETED') {
 *   const result = await client.getResult(task.request_id);
 *   console.log(result.output);
 * }
 * ```
 */
export function createFalClient(options: CreateFalClientOptions) {
  const BASE_URL = options.baseUrl || "https://queue.fal.run";
  const TIMEOUT = options.timeout || 30000;
  const MAX_RETRIES = options.retryAttempts || 3;
  
  const headers = {
    "Authorization": `Key ${options.apiKey}`,
    "Content-Type": "application/json",
  };

  /**
   * Вспомогательная функция для выполнения HTTP-запросов с retry-логикой
   */
  async function makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        
        logger.debug(`🔵 [FAL-REQUEST] Attempt ${attempt}/${MAX_RETRIES}`, {
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
        
        logger.debug(`🔵 [FAL-RESPONSE] Status ${response.status}`, {
          endpoint,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          const errorBody = await response.text();
          
          logger.error(`❌ [FAL-ERROR] Request failed`, {
            endpoint,
            status: response.status,
            errorPreview: errorBody.slice(0, 500)
          });
          
          throw new FalApiError(
            `Fal.AI API error (${response.status}): ${errorBody}`,
            response.status,
            errorBody
          );
        }
        
        const result = await response.json();
        
        logger.debug(`✅ [FAL] Request successful`, {
          endpoint,
          attempt,
          statusCode: response.status
        });
        
        return result as T;
      } catch (error) {
        lastError = error as Error;
        
        const is429 = error instanceof FalApiError && error.statusCode === 429;
        
        logger.warn(`⚠️ [FAL] Attempt ${attempt}/${MAX_RETRIES} failed`, {
          error: lastError.message,
          endpoint,
          is429RateLimit: is429,
          willRetry: attempt < MAX_RETRIES
        });
        
        if (attempt < MAX_RETRIES) {
          const backoffMs = is429 
            ? (2000 * Math.pow(2, attempt - 1)) + Math.random() * 1000
            : (1000 * Math.pow(2, attempt - 1));
          
          logger.info(`⏳ [FAL] Waiting ${Math.round(backoffMs)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else if (is429) {
          throw new FalApiError(
            'Fal.AI API rate limit exceeded. Please wait before retrying.',
            429,
            lastError.message
          );
        }
      }
    }
    
    logger.error(`🔴 [FAL] All retry attempts failed`, {
      endpoint,
      error: lastError?.message
    });
    
    throw lastError || new Error('Fal.AI request failed after all retries');
  }

  return {
    /**
     * Запускает задачу анализа аудио
     * 
     * @param {FalAudioAnalysisPayload} payload - Параметры анализа
     * @returns {Promise<FalQueueResponse>} Информация о задаче
     * 
     * @example
     * ```typescript
     * const task = await client.startAnalysis({
     *   audio_url: 'https://example.com/audio.mp3',
     *   prompt: 'Extract song metadata: title, artist, genre, mood, BPM, instruments',
     *   detailed_analysis: true
     * });
     * console.log('Request ID:', task.request_id);
     * ```
     */
    async startAnalysis(payload: FalAudioAnalysisPayload): Promise<FalQueueResponse> {
      logger.info('[FAL] 🚀 Starting audio analysis', {
        audioUrl: payload.audio_url.substring(0, 100),
        promptLength: payload.prompt.length,
        detailedAnalysis: payload.detailed_analysis ?? false
      });

      return await makeRequest<FalQueueResponse>(
        '/fal-ai/audio-understanding',
        'POST',
        {
          audio_url: payload.audio_url,
          prompt: payload.prompt,
          detailed_analysis: payload.detailed_analysis ?? false
        }
      );
    },

    /**
     * Проверяет статус задачи
     * 
     * @param {string} requestId - ID запроса
     * @param {boolean} includeLogs - Включить логи в ответ
     * @returns {Promise<FalQueueResponse>} Статус задачи
     * 
     * @example
     * ```typescript
     * const status = await client.checkStatus('abc123', true);
     * console.log('Status:', status.status);
     * if (status.logs) {
     *   status.logs.forEach(log => console.log(log.message));
     * }
     * ```
     */
    async checkStatus(requestId: string, includeLogs = false): Promise<FalQueueResponse> {
      logger.debug('[FAL] 🔍 Checking task status', { requestId, includeLogs });

      const endpoint = `/fal-ai/audio-understanding/requests/${requestId}/status${includeLogs ? '?logs=1' : ''}`;
      return await makeRequest<FalQueueResponse>(endpoint, 'GET');
    },

    /**
     * Получает результат завершенной задачи
     * 
     * @param {string} requestId - ID запроса
     * @returns {Promise<FalAudioAnalysisResult>} Результат анализа
     * 
     * @example
     * ```typescript
     * const result = await client.getResult('abc123');
     * console.log('AI Output:', result.output);
     * ```
     */
    async getResult(requestId: string): Promise<FalAudioAnalysisResult> {
      logger.info('[FAL] 📥 Fetching result', { requestId });

      const endpoint = `/fal-ai/audio-understanding/requests/${requestId}`;
      return await makeRequest<FalAudioAnalysisResult>(endpoint, 'GET');
    },

    /**
     * Отменяет выполнение задачи
     * 
     * @param {string} requestId - ID запроса
     * @returns {Promise<{ success: boolean }>} Результат отмены
     * 
     * @example
     * ```typescript
     * const cancelled = await client.cancelTask('abc123');
     * console.log('Cancelled:', cancelled.success);
     * ```
     */
    async cancelTask(requestId: string): Promise<{ success: boolean }> {
      logger.info('[FAL] ❌ Cancelling task', { requestId });

      const endpoint = `/fal-ai/audio-understanding/requests/${requestId}/cancel`;
      return await makeRequest<{ success: boolean }>(endpoint, 'PUT');
    }
  };
}
