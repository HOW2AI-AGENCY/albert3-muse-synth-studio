/**
 * API Service Layer
 * Centralized service for all API calls - keeps business logic separate from UI
 */

import { supabase } from "@/integrations/supabase/client";

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
  status: string;
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
  has_stems?: boolean;
  like_count?: number;
  view_count?: number;
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
    const functionName = request.provider === 'suno' ? 'generate-suno' : 'generate-music';
    
    const { data, error } = await supabase.functions.invoke<GenerateMusicResponse>(
      functionName,
      { body: request }
    );

    if (error) {
      throw new Error(error.message || "Failed to generate music");
    }

    if (!data) {
      throw new Error("No response from server");
    }

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

    return data as Track;
  }

  /**
   * Get all tracks for the current user
   */
  static async getUserTracks(userId: string): Promise<Track[]> {
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch tracks");
    }

    return (data as Track[]) || [];
  }

  /**
   * Delete a track
   */
  static async deleteTrack(trackId: string): Promise<void> {
    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId);

    if (error) {
      throw new Error(error.message || "Failed to delete track");
    }
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
}
