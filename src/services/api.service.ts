/**
 * API Service Layer (DEPRECATED)
 *
 * @deprecated This God Class is being split into domain-specific services.
 * Please use the new domain services instead:
 *
 * - `TrackService` from '@/services/tracks/track.service' for track operations
 * - `LyricsService` from '@/services/lyrics/lyrics.service' for lyrics generation
 * - `PromptService` from '@/services/prompts/prompt.service' for prompt improvement
 * - `BalanceService` from '@/services/balance/balance.service' for provider balance
 * - `StemService` from '@/services/stems/stem.service' for stem operations
 *
 * This service will be removed in v3.0.0
 *
 * @see {@link https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/blob/main/docs/audit/COMPREHENSIVE_AUDIT_REPORT_2025-11-19.md Audit Report}
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handlePostgrestError, handleSupabaseFunctionError } from "@/services/api/errors";
import { logError, logWarn } from "@/utils/logger";

import { startKpiTimer, endKpiTimer } from "@/utils/kpi";
import { retryWithBackoff, RETRY_CONFIGS } from "@/utils/retryWithBackoff";
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { recordPerformanceMetric } from "@/utils/performanceMonitor";
import { type ImprovePromptRequest, type ImprovePromptResponse } from "@/services/prompts/prompt.service";
import { type GenerateLyricsRequest, type GenerateLyricsResponse } from "@/services/lyrics/lyrics.service";
import { type ProviderBalanceResponse } from "@/services/balance/balance.service";
import { type Track, type TrackRowWithVersions, type TrackStatus, mapTrackRowToTrack } from "@/services/tracks/track.service";




type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];






export type SunoModelVersion = 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';

// NOTE: GenerateMusicRequest & GenerateMusicResponse types deprecated
// Use GenerationService from @/services/generation instead
export interface GenerateMusicRequest {
  trackId?: string;
  userId?: string;
  title?: string;
  prompt: string;
  provider?: 'replicate' | 'suno';
  lyrics?: string;
  hasVocals?: boolean;
  styleTags?: string[];
  customMode?: boolean;
  modelVersion?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  referenceAudioUrl?: string;
  makeInstrumental?: boolean;
  referenceAudio?: string;
  referenceTrackId?: string;
}

export interface GenerateMusicResponse {
  success: boolean;
  trackId: string;
}



// NOTE: Legacy lyrics_jobs system removed - functionality now integrated into tracks table
// Keeping types for backward compatibility but they should not be used



/**
 * API Service - handles all backend communication
 */

// Helper for tracking API requests
const trackAPIRequest = (
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: any
) => {
  recordPerformanceMetric('api_call', duration, 'ApiService', {
    endpoint,
    method,
    statusCode,
    error: error ? (error.message || String(error)) : undefined
  });
};

export class ApiService {
  // Ин-флайт запросы и кеш последнего успешного ответа для баланса провайдеров
  private static inFlightBalance: Map<string, Promise<ProviderBalanceResponse>> = new Map();
  private static lastBalanceCache: Map<string, ProviderBalanceResponse> = new Map();
  /**
   * Improve a music prompt using AI
   */
  static async improvePrompt(
    request: ImprovePromptRequest
  ): Promise<ImprovePromptResponse> {
    const context = "ApiService.improvePrompt";
    const timerId = `${context}:${Date.now()}`;
    startKpiTimer(timerId);

    // Используем retry logic для улучшения промпта
    const { data, error } = await retryWithBackoff(
      () => SupabaseFunctions.invoke<ImprovePromptResponse>(
        "improve-prompt",
        { body: request }
      ),
      {
        ...RETRY_CONFIGS.standard,
        onRetry: (error, attempt) => {
          logWarn(
            `Improve prompt request failed, retrying...`,
            context,
            {
              attempt,
              error: error.message,
            }
          );
        },
      }
    );

    // KPI + Sentry
    const duration = endKpiTimer(timerId, 'api_latency', { endpoint: 'improve-prompt' }) ?? 0;
    trackAPIRequest('improve-prompt', 'POST', error ? 500 : 200, duration, error ?? undefined as any);

    if (error || !data) {
      return handleSupabaseFunctionError(
        error,
        "Failed to improve prompt",
        context,
        { promptLength: request.prompt.length }
      );
    }

    return data;
  }

  /**
   * Generate lyrics using AI
   */
  static async generateLyrics(
    request: GenerateLyricsRequest
  ): Promise<GenerateLyricsResponse> {
    const context = "ApiService.generateLyrics";

    // Используем retry logic для генерации текстов
    const { data, error } = await retryWithBackoff(
      () => SupabaseFunctions.invoke<GenerateLyricsResponse>(
        "generate-lyrics",
        { body: request }
      ),
      {
        ...RETRY_CONFIGS.critical,
        onRetry: (error, attempt) => {
          logWarn(
            `Generate lyrics request failed, retrying...`,
            context,
            {
              attempt,
              error: error.message,
            }
          );
        },
      }
    );

    if (error || !data) {
      return handleSupabaseFunctionError(
        error,
        "Failed to start lyrics generation",
        context,
        {
          promptLength: request.prompt.length,
          hasTrack: Boolean(request.trackId),
        }
      );
    }

    return data;
  }


  // Legacy methods removed - lyrics_jobs table no longer exists

  /**
   * Request Suno stem job synchronisation (fallback polling)
   */
  static async syncStemJob(params: {
    trackId: string;
    versionId?: string;
    taskId?: string;
    separationMode?: string;
    forceRefresh?: boolean;
  }): Promise<boolean> {
    const context = "ApiService.syncStemJob";

    const { data, error } = await SupabaseFunctions.invoke<{
      success: boolean;
      status?: string;
      code?: number | null;
      message?: string | null;
    }>("sync-stem-job", {
      body: params,
    });

    if (error) {
      handleSupabaseFunctionError(error, "Failed to synchronise stem job", context, params);
      return false;
    }

    if (!data?.success) {
      logWarn("⚠️ [API Service] Sync stem job response indicated no success", context, {
        ...params,
        status: data?.status ?? null,
        code: data?.code ?? null,
      });
      return false;
    }

    if (data.code && data.code !== 200) {
      logWarn("⚠️ [API Service] Sync stem job completed with non-200 Suno code", context, {
        ...params,
        code: data.code,
        message: data.message ?? null,
      });
    }

    return true;
  }


  /**
   * Get all tracks for the current user with caching support
   */
  static async getUserTracks(userId: string): Promise<Track[]> {
    const context = "ApiService.getUserTracks";
    try {
      // Сначала пытаемся получить треки из API
      // КРИТИЧЕСКИ ВАЖНО: Явно указываем все поля, чтобы избежать undefined значений
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          user_id,
          title,
          prompt,
          improved_prompt,
          audio_url,
          cover_url,
          video_url,
          status,
          error_message,
          provider,
          lyrics,
          style_tags,
          genre,
          mood,
          duration,
          duration_seconds,
          has_vocals,
          is_public,
          metadata,
          suno_id,
          model_name,
          created_at,
          updated_at,
          created_at_suno,
          has_stems,
          like_count,
          play_count,
          download_count,
          view_count,
          reference_audio_url,
          progress_percent,
          idempotency_key,
          archived_to_storage,
          storage_audio_url,
          storage_cover_url,
          storage_video_url,
          archive_scheduled_at,
          archived_at,
          project_id
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      handlePostgrestError(error, "Failed to fetch tracks", context, { userId });

      const tracks = (data ?? []).map((row) => mapTrackRowToTrack(row as TrackRowWithVersions));

      // Кэширование теперь происходит только в useTracks, убираем дублирование
      return tracks;
    } catch (error) {
      logError('Failed to fetch tracks', error as Error, context, { userId });
      throw error;
    }
  }

  /**
   * Get a single track by its ID
   */
  static async getTrackById(trackId: string): Promise<Track | null> {
    const context = "ApiService.getTrackById";
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error) {
      logError('Failed to fetch track by ID', new Error(error.message), context, {
        trackId,
        details: error.details,
      });
      // Don't throw, just return null, as the caller might handle it
      return null;
    }

    return data ? mapTrackRowToTrack(data) : null;
  }

  /**
   * Delete a track with cache cleanup
   */
  static async deleteTrack(trackId: string): Promise<void> {
    const context = "ApiService.deleteTrack";
    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId);

    handlePostgrestError(error, "Failed to delete track", context, { trackId });

    // Кэш теперь управляется только в useTracks через IndexedDB
  }

  /**
   * Delete a specific track version
   */
  static async deleteTrackVersion(versionId: string): Promise<void> {
    const context = "ApiService.deleteTrackVersion";
    const { error } = await supabase
      .from('track_versions')
      .delete()
      .eq('id', versionId);

    handlePostgrestError(error, "Failed to delete version", context, { versionId });
  }

  /**
   * Delete track completely with all versions and stems (cascade)
   */
  static async deleteTrackCompletely(trackId: string): Promise<void> {
    const context = "ApiService.deleteTrackCompletely";
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);

    handlePostgrestError(error, "Failed to delete track completely", context, { trackId });
  }

  /**
   * Update track status
   */
  static async updateTrackStatus(
    trackId: string,
    status: TrackStatus,
    audioUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    const context = "ApiService.updateTrackStatus";
    const updates: Partial<TrackRow> = { status };
    if (audioUrl) updates.audio_url = audioUrl;
    if (errorMessage) updates.error_message = errorMessage;

    const { error } = await supabase
      .from("tracks")
      .update(updates)
      .eq("id", trackId);

    handlePostgrestError(error, "Failed to update track", context, {
      trackId,
      status,
      hasAudioUrl: Boolean(audioUrl),
      hasErrorMessage: Boolean(errorMessage),
    });
  }

  /**
   * Get public tracks (featured/popular)
   */
  static async getPublicTracks(
    limit: number = 9,
    orderBy: 'created_at' | 'like_count' | 'view_count' = 'like_count'
  ): Promise<Track[]> {
    const context = "ApiService.getPublicTracks";
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("is_public", true)
      .eq("status", "completed")
      .not("audio_url", "is", null)
      .order(orderBy, { ascending: false })
      .limit(limit);

    handlePostgrestError(error, "Failed to fetch public tracks", context, {
      limit,
      orderBy,
    });

    return (data ?? []).map(mapTrackRowToTrack);
  }

  /**
   * Increment play count for a track
   */
  static async incrementPlayCount(trackId: string): Promise<void> {
    const context = "ApiService.incrementPlayCount";
    const { error } = await supabase.rpc('increment_play_count', {
      track_id: trackId
    });

    if (error) {
      logWarn('Failed to increment play count', context, {
        trackId,
        error: error.message,
      });
    }
  }

  /**
   * Get provider balance
   */
  static async getProviderBalance(provider: 'suno' | 'replicate'): Promise<ProviderBalanceResponse> {
    const context = "ApiService.getProviderBalance";

    // Переиспользуем уже идущий запрос, чтобы не плодить дубликаты
    const existing = ApiService.inFlightBalance.get(provider);
    if (existing) return existing;

    // Guard: не дергаем edge-функцию без сессии
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        logWarn("⚠️ [API Service] Skipping get-balance invoke: no user session", context, { provider });
        return {
          provider,
          balance: 0,
          currency: 'credits',
          error: 'Unauthorized: sign in to view balance',
        } as ProviderBalanceResponse;
      }
    } catch (sessionError) {
      logWarn("⚠️ [API Service] Failed to read session; returning fallback balance", context, { provider, sessionError: sessionError instanceof Error ? sessionError.message : String(sessionError) });
      return {
        provider,
        balance: 0,
        currency: 'credits',
        error: 'Session check failed',
      } as ProviderBalanceResponse;
    }

    const functionName = `get-balance`;

    const requestPromise: Promise<ProviderBalanceResponse> = (async () => {
      const TIMEOUT_MS = 15000;
      // Реализуем таймаут через гонку промисов
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new Error('get-balance timeout')), TIMEOUT_MS);
        (timeout as any).id = id;
      });

      const timerId = `${context}:${provider}:${Date.now()}`;
      startKpiTimer(timerId);

      try {
        const invokePromise = SupabaseFunctions.invoke(functionName, { body: { provider } });
        const { data, error } = await Promise.race([invokePromise, timeout]) as any;
        const duration = endKpiTimer(timerId, 'api_latency', { endpoint: functionName, provider }) ?? 0;
        trackAPIRequest(functionName, 'POST', error ? 500 : 200, duration, error ?? undefined);
        if (error || !data) {
          return handleSupabaseFunctionError(
            error,
            `Failed to get balance for ${provider}`,
            context,
            { provider }
          );
        }
        ApiService.lastBalanceCache.set(provider, data as ProviderBalanceResponse);
        return data as ProviderBalanceResponse;
      } catch (e) {
        endKpiTimer(timerId, 'api_latency', { endpoint: functionName, provider, aborted: true });
        const cached = ApiService.lastBalanceCache.get(provider);
        if (cached) {
          logWarn('Returning cached provider balance due to error', context, { provider, error: e instanceof Error ? e.message : String(e) });
          return cached;
        }
        return handleSupabaseFunctionError(
          null,
          `Failed to get balance for ${provider}`,
          context,
          { provider }
        );
      } finally {
        const t: any = timeout as any;
        if (t.id) clearTimeout(t.id);
        ApiService.inFlightBalance.delete(provider);
      }
    })();

    ApiService.inFlightBalance.set(provider, requestPromise);
    return requestPromise;
  }
}
