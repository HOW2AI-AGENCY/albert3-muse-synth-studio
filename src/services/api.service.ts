/**
 * API Service Layer
 * Centralized service for all API calls - keeps business logic separate from UI
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ApiError, handlePostgrestError, ensureData, handleSupabaseFunctionError } from "@/services/api/errors";
import { trackCache, CachedTrack, getCachedTracks } from "@/features/tracks";
import { logInfo, logError, logDebug, logWarn } from "@/utils/logger";

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
}

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

export interface LyricsVariant {
  id: string;
  jobId: string;
  index: number;
  title: string | null;
  status: string | null;
  content: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

export interface LyricsGenerationJob {
  id: string;
  trackId: string | null;
  prompt: string;
  status: string;
  sunoTaskId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  callStrategy: string;
  callbackUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastCallback: Record<string, unknown> | null;
  lastPollResponse: Record<string, unknown> | null;
  variants: LyricsVariant[];
}

type LyricsJobRow = Database["public"]["Tables"]["lyrics_jobs"]["Row"];
type LyricsVariantRow = Database["public"]["Tables"]["lyrics_variants"]["Row"];

interface LyricsJobRecord extends LyricsJobRow {
  variants?: LyricsVariantRow[] | null;
}

const mapLyricsVariant = (variant: LyricsVariantRow): LyricsVariant => ({
  id: variant.id,
  jobId: variant.job_id,
  index: variant.variant_index,
  title: variant.title,
  status: variant.status,
  content: variant.content,
  errorMessage: variant.error_message,
  updatedAt: variant.updated_at,
});

const mapLyricsJobRecord = (record: LyricsJobRecord): LyricsGenerationJob => {
  const variants = Array.isArray(record.variants)
    ? record.variants
        .map(mapLyricsVariant)
        .sort((a, b) => a.index - b.index)
    : [];

  return {
    id: record.id,
    trackId: record.track_id,
    prompt: record.prompt,
    status: record.status,
    sunoTaskId: record.suno_task_id,
    errorMessage: record.error_message,
    metadata: (record.metadata ?? null) as Record<string, unknown> | null,
    callStrategy: record.call_strategy,
    callbackUrl: record.callback_url,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    lastCallback: (record.last_callback ?? null) as Record<string, unknown> | null,
    lastPollResponse: (record.last_poll_response ?? null) as Record<string, unknown> | null,
    variants,
  };
};

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
    const provider = request.provider || 'suno';
    const functionName = provider === 'suno' ? 'generate-suno' : 'generate-music';

    // Logic to determine the final prompt based on the new API contract.
    // In custom mode, lyrics are sent as the main prompt.
    const promptForSuno = request.customMode ? (request.lyrics || '') : (request.prompt || '');

    const payload = {
      trackId: request.trackId,
      title: request.title || request.prompt.substring(0, 50),
      prompt: promptForSuno,
      // The 'tags' array is now a single 'style' string.
      style: (request.styleTags ?? []).join(', '),
      // The `instrumental` flag replaces `make_instrumental` and `hasVocals`.
      instrumental: request.hasVocals === false,
      // The `model` field replaces `model_version`.
      model: request.modelVersion || 'V5',
      customMode: request.customMode,
    };

    logInfo('🎵 [API Service] Selected provider', context, { provider, functionName });
    logDebug('📤 [API Service] Payload summary', context, {
      hasTrackId: Boolean(request.trackId),
      promptLength: request.prompt.length,
      tagsCount: request.styleTags?.length ?? 0,
      hasVocals: request.hasVocals ?? false,
      lyricsLength: request.lyrics?.length ?? 0,
      customMode: request.customMode ?? null,
    });

    logInfo('⏳ [API Service] Invoking edge function...', context);

    const { data, error } = await supabase.functions.invoke<GenerateMusicResponse>(
      functionName,
      { body: payload }
    );

    if (error) {
      logError('🔴 [API Service] Edge function error', error, context, { provider, functionName });
      let userMessage = error.message || "Failed to generate music";
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
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

    if (!data) {
      const err = new Error('No response from server');
      logError('🔴 [API Service] No response from server', err, context, { provider, functionName });
      throw new ApiError('No response from server', {
        context,
        payload: { provider, functionName },
        cause: err,
      });
    }

    logInfo('✅ [API Service] Generation success', context, {
      provider,
      functionName,
      trackId: data.trackId,
      success: data.success,
    });

    return data;
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
   */
  static async getLyricsJob(jobId: string): Promise<LyricsGenerationJob | null> {
    const context = "ApiService.getLyricsJob";
    const { data, error } = await supabase
      .from("lyrics_jobs")
      .select(`
        id,
        track_id,
        prompt,
        status,
        suno_task_id,
        error_message,
        metadata,
        call_strategy,
        callback_url,
        created_at,
        updated_at,
        last_callback,
        last_poll_response,
        variants:lyrics_variants (
          id,
          job_id,
          variant_index,
          title,
          status,
          content,
          error_message,
          updated_at
        )
      `)
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      handlePostgrestError(error, "Failed to fetch lyrics job", context, { jobId });
      return null;
    }

    if (!data) {
      return null;
    }

    return mapLyricsJobRecord(data as LyricsJobRecord);
  }

  /**
   * Request a fresh sync with Suno for a lyrics job
   */
  static async syncLyricsJob(jobId: string): Promise<LyricsGenerationJob | null> {
    const context = "ApiService.syncLyricsJob";
    const { data, error } = await supabase.functions.invoke<{
      success: boolean;
      job: LyricsJobRecord | null;
    }>("sync-lyrics-job", {
      body: { jobId },
    });

    if (error) {
      handleSupabaseFunctionError(error, "Failed to synchronise lyrics job", context, { jobId });
      return null;
    }

    if (!data?.success || !data.job) {
      logWarn("⚠️ [API Service] Sync lyrics job returned no data", context, { jobId, success: data?.success ?? false });
      return null;
    }

    return mapLyricsJobRecord(data.job);
  }

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

      // Кэшируем треки с аудио
      const tracksToCache: Omit<CachedTrack, 'cached_at'>[] = tracks
        .filter((track): track is Track & { audio_url: string } => Boolean(track.audio_url) && track.status === 'completed')
        .map((track) => ({
          id: track.id,
          title: track.title,
          artist: 'AI Generated',
          audio_url: track.audio_url,
          image_url: track.cover_url || undefined,
          duration: track.duration_seconds || undefined,
          genre: track.style_tags?.join(', ') || undefined,
          created_at: track.created_at,
        }));

      if (tracksToCache.length > 0) {
        trackCache.setTracks(tracksToCache);
      }

      return tracks;
    } catch (error) {
      logWarn('Ошибка при загрузке треков из API, пытаемся использовать кэш', context, {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // В случае ошибки API пытаемся получить треки из кэша
      const cacheStats = trackCache.getCacheStats();
      if (cacheStats.totalTracks > 0) {
        logInfo(`Используем кэшированные треки: ${cacheStats.totalTracks} треков`, context);

        const cachedEntries = getCachedTracks();
        if (cachedEntries.length > 0) {
          const cachedTracks: Track[] = cachedEntries.map((cachedTrack) => {
            const styleTags = cachedTrack.genre
              ? cachedTrack.genre
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : null;

            return {
              id: cachedTrack.id,
              user_id: userId,
              title: cachedTrack.title,
              prompt: '',
              improved_prompt: null,
              audio_url: cachedTrack.audio_url,
              cover_url: cachedTrack.image_url ?? null,
              video_url: null,
              status: 'completed' as TrackStatus,
              error_message: null,
              provider: null,
              lyrics: null,
              style_tags: styleTags,
              genre: cachedTrack.genre ?? null,
              mood: null,
              duration: cachedTrack.duration ?? null,
              duration_seconds: cachedTrack.duration ?? null,
              has_vocals: null,
              is_public: false,
              metadata: null,
              suno_id: null,
              model_name: null,
              created_at: cachedTrack.created_at,
              updated_at: cachedTrack.created_at,
              created_at_suno: null,
              has_stems: false,
              like_count: 0,
              play_count: 0,
              download_count: 0,
              view_count: 0,
              reference_audio_url: null,
              artist: cachedTrack.artist,
              style: null,
            } as Track;
          });

          return cachedTracks;
        }
      }

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

    // Удаляем трек из кэша
    trackCache.removeTrack(trackId);
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
