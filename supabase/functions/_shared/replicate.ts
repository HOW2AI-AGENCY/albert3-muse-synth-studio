// deno-lint-ignore-file no-explicit-any
import { logger } from './logger.ts';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');

interface ReplicateClientOptions {
  apiKey: string;
  timeout?: number;
}

export class ReplicateApiError extends Error {
  constructor(message: string, public details?: any, public status?: number) {
    super(message);
    this.name = 'ReplicateApiError';
  }
}

/**
 * Универсальный клиент для взаимодействия с Replicate API.
 */
export const createReplicateClient = (options: ReplicateClientOptions) => {
  const { apiKey, timeout = 30000 } = options;

  const headers = {
    'Authorization': `Token ${apiKey}`,
    'Content-Type': 'application/json',
  };

  /**
   * Запускает задачу (prediction) для указанной модели.
   * @param modelVersion - Версия модели (e.g., "meta/musicgen:...")
   * @param input - Входные данные для модели
   * @param webhook - URL для получения уведомления о завершении
   * @returns Объект запущенной задачи
   */
  const run = async (modelVersion: string, input: Record<string, any>, webhook?: string) => {
    logger.info('🚀 Starting Replicate prediction', { modelVersion });

    const body: Record<string, any> = {
      version: modelVersion,
      input,
    };

    if (webhook) {
      body.webhook = webhook;
      body.webhook_events_filter = ["completed"];
    }

    const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('🔴 Replicate API error on run', {
        status: response.status,
        error: errorText.substring(0, 500),
      });
      throw new ReplicateApiError('Failed to start prediction', { details: errorText }, response.status);
    }

    return await response.json();
  };

  /**
   * Получает статус и результат выполнения задачи.
   * @param predictionId - ID задачи
   * @returns Объект задачи
   */
  const get = async (predictionId: string) => {
    logger.info('🔍 Checking Replicate prediction status', { predictionId });

    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('🔴 Replicate API error on get', {
        status: response.status,
        error: errorText.substring(0, 500),
      });
      throw new ReplicateApiError('Failed to get prediction status', { details: errorText }, response.status);
    }

    return await response.json();
  };

  return { run, get };
};

/**
 * Стандартный инстанс клиента, использующий переменные окружения.
 */
export const replicate = REPLICATE_API_KEY
  ? createReplicateClient({ apiKey: REPLICATE_API_KEY })
  : null;
