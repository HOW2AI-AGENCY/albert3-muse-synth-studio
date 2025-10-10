/**
 * API Service Layer
 * Centralized service for all API calls - keeps business logic separate from UI
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ApiError, handlePostgrestError, ensureData, handleSupabaseFunctionError } from "@/services/api/errors";
import { logInfo, logError, logDebug, logWarn, maskObject } from "@/utils/logger";

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];

export type TrackStatus = "pending" | "processing" | "completed" | "failed";

export type Track = TrackRow & {
  status: TrackStatus;
  style?: string | null;
};

const isTrackStatus = (status: TrackRow["status"]): status is TrackStatus =>
  status === "pending" ||
  status === "processing" ||
  status === "completed" ||
  status === "failed";

export const mapTrackRowToTrack = (track: TrackRow): Track => ({
  ...track,
  status: isTrackStatus(track.status) ? track.status : "pending",
});

export interface ImprovePromptRequest {
  prompt: string;
}

export interface ImprovePromptResponse {
  improvedPrompt: string;
}

export type SunoModelVersion = 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';

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
}

/**
 * Normalize client-side model names to Suno API expected format
 */
const normalizeSunoModel = (input?: string): SunoModelVersion => {
  const mapping: Record<string, SunoModelVersion> = {
    'chirp-v3-5': 'V3_5',
    'chirp-v3.5': 'V3_5',
    'v3.5': 'V3_5',
    'chirp-v4': 'V4',
    'v4': 'V4',
    'chirp-v4-5': 'V4_5',
    'chirp-v4.5': 'V4_5',
    'v4.5': 'V4_5',
    'chirp-v4-5plus': 'V4_5PLUS',
    'chirp-v4.5plus': 'V4_5PLUS',
    'v4.5plus': 'V4_5PLUS',
    'chirp-crow': 'V5',
    'chirp-v5': 'V5',
    'v5': 'V5',
  };
  
  const normalized = input?.toLowerCase().trim();
  return mapping[normalized ?? ''] ?? 'V5'; // Default to latest version
};

export interface GenerateMusicResponse {
  success: boolean;
  trackId: string;
}

export interface GenerateLyricsRequest {
  prompt: string;
  trackId?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateLyricsResponse {
  success: boolean;
  jobId: string;
  taskId: string;
  status: string;
}

// NOTE: Legacy lyrics_jobs system removed - functionality now integrated into tracks table
// Keeping types for backward compatibility but they should not be used

export type ProviderBalanceResponse = {
  balance: number | null;
  error?: string | null;
} & Record<string, unknown>;

/**
 * API Service - handles all backend communication
 */
export class ApiService {
  /**
   * Improve a music prompt using AI
   */
  static async improvePrompt(
    request: ImprovePromptRequest
  ): Promise<ImprovePromptResponse> {
    const context = "ApiService.improvePrompt";
    const { data, error } = await supabase.functions.invoke<ImprovePromptResponse>(
      "improve-prompt",
      { body: request }
    );

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
   * Start music generation process
   */
  static async generateMusic(
    request: GenerateMusicRequest
  ): Promise<GenerateMusicResponse> {
    const context = "ApiService.generateMusic";
    // --- Укрепление и логирование ---
    const provider = !request.provider || !['suno', 'replicate'].includes(request.provider)
      ? 'suno'
      : request.provider;
    const functionName = provider === 'suno' ? 'generate-suno' : 'generate-music';

    try {
      const normalizedPrompt = request.prompt?.trim() ?? '';
      const lyrics = request.lyrics;
      const styleTags = request.styleTags?.filter((tag) => Boolean(tag?.trim())) ?? [];
      const promptForSuno = request.customMode ? (lyrics ?? normalizedPrompt) : normalizedPrompt;

      const resolvedTitle = (() => {
        const explicitTitle = request.title?.trim();
        if (explicitTitle) return explicitTitle;
        const fallbackSource = normalizedPrompt || lyrics || '';
        return fallbackSource ? fallbackSource.substring(0, 50) : 'Generated Track';
      })();

      const makeInstrumental = request.hasVocals === false;
      
      // Normalize model version to Suno API format
      const normalizedModel = normalizeSunoModel(request.modelVersion);

      const payload: Record<string, unknown> = {
        trackId: request.trackId,
        title: resolvedTitle,
        prompt: promptForSuno,
        tags: styleTags,
        lyrics,
        hasVocals: request.hasVocals,
        make_instrumental: makeInstrumental,
        model_version: normalizedModel,
        customMode: request.customMode,
      };

      // --- Опциональные параметры с валидацией/нормализацией ---
      const trimmedNegativeTags = request.negativeTags?.trim();
      if (trimmedNegativeTags) {
        payload.negativeTags = trimmedNegativeTags;
      }

      if (request.vocalGender === 'm' || request.vocalGender === 'f') {
        payload.vocalGender = request.vocalGender;
      }

      const clamp = (val: number) => Math.max(0, Math.min(1, val));

      if (typeof request.styleWeight === 'number' && !Number.isNaN(request.styleWeight)) {
        payload.styleWeight = clamp(request.styleWeight);
      }
      if (typeof request.weirdnessConstraint === 'number' && !Number.isNaN(request.weirdnessConstraint)) {
        payload.weirdnessConstraint = clamp(request.weirdnessConstraint);
      }
      if (typeof request.audioWeight === 'number' && !Number.isNaN(request.audioWeight)) {
        payload.audioWeight = clamp(request.audioWeight);
      }

      logInfo(`🎵 [API Service] Starting music generation`, context, { provider, functionName });
      logDebug(`📤 [API Service] Sending payload to ${functionName}`, context, {
        ...maskObject(payload),
        // Явно логируем нечувствительные метаданные для быстрой диагностики
        promptLength: normalizedPrompt.length,
        lyricsLength: lyrics?.length ?? 0,
        tagsCount: styleTags.length,
        hasTrackId: !!payload.trackId,
      });

      logInfo('⏳ [API Service] Invoking edge function...', context);
      const { data, error } = await supabase.functions.invoke<GenerateMusicResponse>(
        functionName,
        { body: payload }
      );

      // --- Обработка ошибок ---
      if (error) {
        logError('🔴 [API Service] Edge function invocation failed', error, context, {
          provider,
          functionName,
        });

        let userMessage = error.message || "Не удалось запустить генерацию музыки";
        // Проверяем на частые клиентские проблемы, которые маскируются под сетевые ошибки
        if (error.message.toLowerCase().includes('failed to fetch')) {
          userMessage = "Сетевая ошибка при вызове функции. Возможно, проблема с CORS. Проверьте консоль браузера на наличие ошибок, связанных с 'no-cors'.";
        } else if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          userMessage = 'Превышен лимит запросов. Пожалуйста, подождите немного';
        } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
          userMessage = 'Недостаточно средств. Пополните баланс API';
        }

        throw new ApiError(userMessage, {
          context,
          payload: { provider, functionName },
          cause: error,
        });
      }

      // --- Обработка ответа ---
      if (!data) {
        const err = new Error('No data in response from edge function');
        logError('🔴 [API Service] Empty response from server', err, context, { provider, functionName });
        throw new ApiError('Сервер вернул пустой ответ. Не удалось подтвердить запуск генерации.', {
          context,
          payload: { provider, functionName },
          cause: err,
        });
      }

      logInfo('✅ [API Service] Edge function returned successfully', context, {
        provider,
        functionName,
        data: data ? { success: true } : undefined,
      });

      return data;

    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logError('🆘 [API Service] Unhandled exception in generateMusic', error, context, {
        provider,
        functionName,
      });

      // Перевыбрасываем ошибку, чтобы она была обработана выше
      throw error;
    }
  }

  /**
   * Generate lyrics using AI
   */
  static async generateLyrics(
    request: GenerateLyricsRequest
  ): Promise<GenerateLyricsResponse> {
    const context = "ApiService.generateLyrics";
    const { data, error } = await supabase.functions.invoke<GenerateLyricsResponse>(
      "generate-lyrics",
      { body: request }
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

  /**
   * Fetch lyrics generation job with variants
   * NOTE: Legacy method - lyrics system removed
   */
  static async getLyricsJob(_jobId: string): Promise<any | null> {
    return null;
  }

  /**
   * Request a fresh sync with Suno for a lyrics job
   * NOTE: Legacy method - lyrics system removed
   */
  static async syncLyricsJob(_jobId: string): Promise<any | null> {
    return null;
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

    const { data, error } = await supabase.functions.invoke<{
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
   * Create a new track record
   */
  static async createTrack(
    userId: string,
    title: string,
    prompt: string,
    provider: string = 'replicate',
    lyrics?: string,
    hasVocals?: boolean,
    styleTags?: string[]
  ): Promise<Track> {
    const context = "ApiService.createTrack";
    const { data, error } = await supabase
      .from("tracks")
      .insert({
        user_id: userId,
        title: title.substring(0, 100),
        prompt: prompt,
        status: "pending",
        provider,
        lyrics,
        has_vocals: hasVocals,
        style_tags: styleTags,
      })
      .select()
      .single();

    handlePostgrestError(error, "Failed to create track", context, {
      userId,
      provider,
      hasLyrics: Boolean(lyrics),
    });

    const record = ensureData(data, "Failed to create track", context, {
      userId,
      provider,
    });

    return mapTrackRowToTrack(record);
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
          reference_audio_url
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      handlePostgrestError(error, "Failed to fetch tracks", context, { userId });

      const tracks = (data ?? []).map(mapTrackRowToTrack);

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
    // Guard: avoid invoking edge function without user session
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
    // Corrected: Use GET request with query parameters for better REST compliance
    const functionName = `get-balance?provider=${provider}`;
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: 'GET',
    });

    if (error || !data) {
      return handleSupabaseFunctionError(
        error,
        `Failed to get balance for ${provider}`,
        context,
        { provider }
      );
    }

    return data as ProviderBalanceResponse;
  }
}
