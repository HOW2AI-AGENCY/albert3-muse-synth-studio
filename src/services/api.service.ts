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
  trackId: string;
  prompt: string;
}

export interface GenerateMusicResponse {
  success: boolean;
  trackId: string;
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
  error_message: string | null;
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
    const { data, error } = await supabase.functions.invoke<GenerateMusicResponse>(
      "generate-music",
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
   * Create a new track record
   */
  static async createTrack(userId: string, title: string, prompt: string): Promise<Track> {
    const { data, error } = await supabase
      .from("tracks")
      .insert({
        user_id: userId,
        title: title.substring(0, 100),
        prompt: prompt,
        status: "pending",
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
