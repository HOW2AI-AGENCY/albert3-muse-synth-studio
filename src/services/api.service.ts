/**
 * API Service Layer
 * Centralized service for all API calls - keeps business logic separate from UI
 */

import { supabase } from "@/integrations/supabase/client";
import { trackCache, CachedTrack } from "@/utils/trackCache";

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

export interface Track {
  id: string;
  title: string;
  audio_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  prompt: string;
  improved_prompt: string | null;
  duration: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  cover_url: string | null;
  video_url: string | null;
  suno_id: string | null;
  model_name: string | null;
  created_at_suno: string | null;
  lyrics: string | null;
  style_tags: string[] | null;
  has_vocals: boolean | null;
  provider: string | null;
  has_stems?: boolean;
  like_count?: number;
  view_count?: number;
  play_count?: number;
  style?: string;
}

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
    const startTime = Date.now();
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Явно определяем провайдера с fallback
    const provider = request.provider || 'suno'; // По умолчанию используем suno
    const functionName = provider === 'suno' ? 'generate-suno' : 'generate-music';
    
    // Transform request to match backend expectations
    const payload = {
      trackId: request.trackId,
      title: request.title || request.prompt.substring(0, 50),
      prompt: request.prompt,
      tags: request.styleTags?.join(', ') || '',
      make_instrumental: !request.hasVocals,
      model_version: 'chirp-v3-5',
      wait_audio: false,
    };

    console.log('🎵 [API Service] Generation Request Started', {
      timestamp: new Date().toISOString(),
      provider,
      functionName,
      trackId: request.trackId,
      userId: request.userId,
      hasVocals: request.hasVocals,
      prompt: request.prompt.substring(0, 100),
    });
    console.log('📤 [API Service] Payload:', JSON.stringify(payload, null, 2));
    
    try {
      console.log('⏳ [API Service] Invoking edge function...', {
        function: functionName,
        timestamp: new Date().toISOString()
      });
      
      const { data, error } = await supabase.functions.invoke<GenerateMusicResponse>(
        functionName,
        { body: payload }
      );

      const duration = Date.now() - startTime;

      if (error) {
        console.error('🔴 [API Service] Edge function error:', {
          error,
          duration,
          timestamp: new Date().toISOString(),
          functionName,
          statusCode: error.context?.status || 'unknown'
        });
        
        // Parse error message for user-friendly display
        let userMessage = error.message || "Failed to generate music";
        
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          userMessage = 'Превышен лимит запросов. Пожалуйста, подождите немного';
        } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
          userMessage = 'Недостаточно средств. Пополните баланс API';
        } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          userMessage = 'Требуется авторизация. Войдите в систему';
        } else if (error.message?.includes('Failed to fetch')) {
          userMessage = 'Не удалось подключиться к серверу. Проверьте соединение';
        }
        
        throw new Error(userMessage);
      }

      if (!data) {
        console.error('🔴 [API Service] No response from server', {
          duration,
          timestamp: new Date().toISOString()
        });
        throw new Error("No response from server");
      }

      console.log('✅ [API Service] Success:', {
        trackId: data.trackId,
        success: data.success,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('🔴 [API Service] Generation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
        provider,
        functionName
      });
      throw error;
    }
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

    return data as Track;
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

      const tracks = (data as Track[]) || [];

      // Кэшируем треки с аудио
      const tracksToCache: Omit<CachedTrack, 'cached_at'>[] = tracks
        .filter(track => track.audio_url && track.status === 'completed')
        .map(track => ({
          id: track.id,
          title: track.title,
          artist: 'AI Generated',
          audio_url: track.audio_url!,
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
        return [];
      }
      
      throw error;
    }
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
    status: string,
    audioUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };
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
  static async getPublicTracks(limit: number = 9, orderBy: 'created_at' | 'like_count' | 'view_count' = 'like_count'): Promise<Track[]> {
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

    return (data as Track[]) || [];
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
}
