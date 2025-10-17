/**
 * Provider Router - Централизованная маршрутизация запросов к AI провайдерам
 * 
 * Унифицирует вызовы generate() и getBalance() для разных провайдеров (Suno, Mureka)
 * Устраняет дублирование логики между ApiService и useMusicGenerationStore
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { MusicProvider } from '@/config/provider-models';

export interface GenerateOptions {
  provider: MusicProvider;
  trackId?: string;
  title?: string;
  prompt: string;
  lyrics?: string;
  styleTags?: string[];
  hasVocals?: boolean;
  makeInstrumental?: boolean;
  modelVersion?: string;
  idempotencyKey?: string;
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  audioWeight?: number;
  styleWeight?: number;
  lyricsWeight?: number;
  weirdness?: number;
  negativeTags?: string;
  vocalGender?: 'm' | 'f' | 'any';
  customMode?: boolean;
  isBGM?: boolean;
  audioPrompt?: string;
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

  logger.info('Routing music generation', undefined, { provider, trackId: params.trackId });

  try {
    switch (provider) {
      case 'suno': {
        const { data, error } = await supabase.functions.invoke('generate-suno', {
          body: {
            trackId: params.trackId,
            title: params.title,
            prompt: params.prompt || params.lyrics || 'Music generation',
            lyrics: params.lyrics,
            tags: params.styleTags || [],
            make_instrumental: params.makeInstrumental ?? !params.hasVocals,
            hasVocals: params.hasVocals,
            customMode: params.customMode ?? !!params.lyrics,
            model_version: params.modelVersion || 'chirp-v3-5',
            idempotencyKey: params.idempotencyKey,
            referenceAudioUrl: params.referenceAudioUrl,
            referenceTrackId: params.referenceTrackId,
            audioWeight: params.audioWeight,
            styleWeight: params.styleWeight,
            lyricsWeight: params.lyricsWeight,
            weirdness: params.weirdness,
            negativeTags: params.negativeTags,
            vocalGender: params.vocalGender,
            isBGM: params.isBGM,
            audioPrompt: params.audioPrompt,
          },
        });

        if (error) throw error;
        return data as GenerateResponse;
      }

      case 'mureka': {
        const { data, error } = await supabase.functions.invoke('generate-mureka', {
          body: {
            trackId: params.trackId,
            title: params.title,
            prompt: params.prompt,
            lyrics: params.lyrics,
            styleTags: params.styleTags,
            hasVocals: params.hasVocals,
            isBGM: params.isBGM,
            modelVersion: params.modelVersion || 'auto',
            idempotencyKey: params.idempotencyKey,
            makeInstrumental: params.makeInstrumental,
            customMode: params.customMode,
            negativeTags: params.negativeTags,
            audioWeight: params.audioWeight,
            styleWeight: params.styleWeight,
            lyricsWeight: params.lyricsWeight,
            weirdness: params.weirdness,
            referenceAudioUrl: params.referenceAudioUrl,
            referenceTrackId: params.referenceTrackId,
            vocalGender: params.vocalGender,
          },
        });

        if (error) throw error;
        return data as GenerateResponse;
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    logger.error('Provider router generation error', error instanceof Error ? error : new Error(String(error)), 'ProviderRouter', { provider });
    throw error;
  }
};

/**
 * Маршрутизация получения баланса к нужному провайдеру
 */
export const getProviderBalance = async (provider: MusicProvider): Promise<ProviderBalance> => {
  logger.info('Routing balance request', undefined, { provider });

  try {
    switch (provider) {
      case 'suno': {
        const { data, error } = await supabase.functions.invoke('get-balance', {});

        if (error) throw error;
        
        return {
          balance: data?.balance ?? 0,
          currency: data?.currency || 'USD',
          details: data,
        };
      }

      case 'mureka': {
        const { data, error } = await supabase.functions.invoke('get-mureka-balance', {});

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
    logger.error('Provider router balance error', error instanceof Error ? error : new Error(String(error)), 'ProviderRouter', { provider });
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
    logger.warn('Provider availability check failed', undefined, { provider, error });
    return false;
  }
};
