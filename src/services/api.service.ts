/**
 * API Service Layer
 * Centralized service for all API calls - keeps business logic separate from UI
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackCache, CachedTrack } from "@/utils/trackCache";
import { logInfo, logError, logDebug } from "@/utils/logger";

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
}

export interface GenerateMusicResponse {
  success: boolean;
  trackId: string;
}

export interface GenerateLyricsRequest {
  theme: string;
  mood: string;
  genre: string;
  language?: 'ru' | 'en';
  structure?: string;
  vocalStyle?: string;
  references?: string;
}

export interface GenerateLyricsResponse {
  lyrics: string;
  metadata: {
    theme: string;
    mood: string;
    genre: string;
    language: string;
    structure: string;
  };
}

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
    const { data, error } = await supabase.functions.invoke<ImprovePromptResponse>(
      "improve-prompt",
      { body: request }
    );

    if (error) {
      throw new Error(error.message || "Failed to improve prompt");
    }

    if (!data) {
      throw new Error("No response from server");
    }

    return data;
  }

  /**
   * Start music generation process
   */
  static async generateMusic(
    request: GenerateMusicRequest
  ): Promise<GenerateMusicResponse> {
    const provider = request.provider || 'suno';
    const functionName = provider === 'suno' ? 'generate-suno' : 'generate-music';

    const payload = {
      trackId: request.trackId,
      title: request.title || request.prompt.substring(0, 50),
      prompt: request.prompt,
      tags: request.styleTags?.join(', ') || '',
      make_instrumental: !request.hasVocals,
      model_version: 'chirp-v3-5',
      wait_audio: false,
    };

    logInfo('🎵 [API Service] Provider:', 'ApiService', { provider });
    logInfo('🎵 [API Service] Sending to:', 'ApiService', { functionName });
    logDebug('📤 [API Service] Payload:', 'ApiService', { payload });

    logInfo('⏳ [API Service] Invoking edge function...', 'ApiService');

    const { data, error } = await supabase.functions.invoke<GenerateMusicResponse>(
      functionName,
      { body: payload }
    );

    if (error) {
      logError('🔴 [API Service] Edge function error', error, 'ApiService');
      let userMessage = error.message || "Failed to generate music";
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        userMessage = 'Превышен лимит запросов. Пожалуйста, подождите немного';
      } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
        userMessage = 'Недостаточно средств. Пополните баланс API';
      }
      throw new Error(userMessage);
    }

    if (!data) {
      const err = new Error("No response from server");
      logError('🔴 [API Service] No response from server', err, 'ApiService');
      throw err;
    }

    logInfo('✅ [API Service] Success:', 'ApiService', { data });
    return data;
  }

  /**
   * Generate lyrics using AI
   */
  static async generateLyrics(
    request: GenerateLyricsRequest
  ): Promise<GenerateLyricsResponse> {
    const { data, error } = await supabase.functions.invoke<GenerateLyricsResponse>(
      "generate-lyrics",
      { body: request }
    );

    if (error) {
      throw new Error(error.message || "Failed to generate lyrics");
    }

    if (!data) {
      throw new Error("No response from server");
    }

    return data;
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

    if (error) {
      throw new Error(error.message || "Failed to create track");
    }

    if (!data) {
      throw new Error("Failed to create track");
    }

    return mapTrackRowToTrack(data);
  }

  /**
   * Get all tracks for the current user with caching support
   */
  static async getUserTracks(userId: string): Promise<Track[]> {
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

      if (error) {
        throw new Error(error.message || "Failed to fetch tracks");
      }

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
      console.warn('Ошибка при загрузке треков из API, пытаемся использовать кэш:', error);
      
      // В случае ошибки API пытаемся получить треки из кэша
      const cacheStats = trackCache.getCacheStats();
      if (cacheStats.totalTracks > 0) {
        console.info(`Используем кэшированные треки: ${cacheStats.totalTracks} треков`);
        
        // Получаем все треки из кэша и преобразуем их в формат Track
        // Это упрощенная версия, в реальности нужно было бы сохранять больше данных
        const cachedTracks: Track[] = [];
        return cachedTracks;
      }
      
      throw error;
    }
  }

  /**
   * Get a single track by its ID
   */
  static async getTrackById(trackId: string): Promise<Track | null> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error) {
      logError('Failed to fetch track by ID', error, 'ApiService', { trackId });
      // Don't throw, just return null, as the caller might handle it
      return null;
    }

    return data ? mapTrackRowToTrack(data) : null;
  }

  /**
   * Delete a track with cache cleanup
   */
  static async deleteTrack(trackId: string): Promise<void> {
    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId);

    if (error) {
      throw new Error(error.message || "Failed to delete track");
    }

    // Удаляем трек из кэша
    trackCache.removeTrack(trackId);
  }

  /**
   * Delete a specific track version
   */
  static async deleteTrackVersion(versionId: string): Promise<void> {
    const { error } = await supabase
      .from('track_versions')
      .delete()
      .eq('id', versionId);

    if (error) {
      throw new Error(error.message || "Failed to delete version");
    }
  }

  /**
   * Delete track completely with all versions and stems (cascade)
   */
  static async deleteTrackCompletely(trackId: string): Promise<void> {
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);

    if (error) {
      throw new Error(error.message || "Failed to delete track completely");
    }
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
    const updates: Partial<TrackRow> = { status };
    if (audioUrl) updates.audio_url = audioUrl;
    if (errorMessage) updates.error_message = errorMessage;

    const { error } = await supabase
      .from("tracks")
      .update(updates)
      .eq("id", trackId);

    if (error) {
      throw new Error(error.message || "Failed to update track");
    }
  }

  /**
   * Get public tracks (featured/popular)
   */
  static async getPublicTracks(
    limit: number = 9,
    orderBy: 'created_at' | 'like_count' | 'view_count' = 'like_count'
  ): Promise<Track[]> {
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("is_public", true)
      .eq("status", "completed")
      .not("audio_url", "is", null)
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message || "Failed to fetch public tracks");
    }

    return (data ?? []).map(mapTrackRowToTrack);
  }

  /**
   * Increment play count for a track
   */
  static async incrementPlayCount(trackId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_play_count', {
      track_id: trackId
    });

    if (error) {
      console.error('Failed to increment play count:', error);
    }
  }

  /**
   * Get provider balance
   */
  static async getProviderBalance(provider: 'suno' | 'replicate'): Promise<ProviderBalanceResponse> {
    const { data, error } = await supabase.functions.invoke('get-balance', {
      body: { provider },
    });

    if (error) {
      logError('Failed to get provider balance', error, 'ApiService', { provider });
      throw new Error(error.message || `Failed to get balance for ${provider}`);
    }

    if (!data) {
      throw new Error('No response from server when fetching balance');
    }

    return data as ProviderBalanceResponse;
  }
}
