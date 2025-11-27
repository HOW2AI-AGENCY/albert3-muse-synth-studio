/**
 * Track Service
 *
 * Handles all track-related operations including CRUD, playback tracking,
 * and public tracks retrieval.
 *
 * @module services/tracks/track.service
 * @since v2.6.3
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handlePostgrestError } from "@/services/api/errors";
import { logError, logWarn } from "@/utils/logger";
import type { TrackMetadata } from "@/types/track-metadata";
import type { Track, TrackVersion } from '@/types/track.types';

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
type TrackVersionRow = Database["public"]["Tables"]["track_versions"]["Row"];

export type { Track, TrackVersion };

export type TrackRowWithVersions = TrackRow & {
  track_versions: TrackVersionRow[];
};

export type TrackStatus = "pending" | "draft" | "processing" | "completed" | "failed";

const isTrackStatus = (status: TrackRow["status"]): status is TrackStatus =>
  status === "pending" ||
  status === "draft" ||
  status === "processing" ||
  status === "completed" ||
  status === "failed";

export const mapTrackRowToTrack = (track: TrackRow | TrackRowWithVersions): Track => {
  const trackWithVersions = track as TrackRowWithVersions;
  const versions = Array.isArray(trackWithVersions.track_versions) ? trackWithVersions.track_versions : [];

  return {
    id: track.id,
    created_at: track.created_at,
    updated_at: track.updated_at,
    user_id: track.user_id,
    title: track.title,
    prompt: track.prompt,
    improved_prompt: track.improved_prompt,
    status: isTrackStatus(track.status) ? track.status : "pending",
    audio_url: track.audio_url,
    cover_url: track.cover_url,
    video_url: track.video_url,
    style_tags: track.style_tags,
    lyrics: track.lyrics,
    duration: track.duration,
    duration_seconds: track.duration_seconds,
    error_message: track.error_message,
    provider: track.provider,
    genre: track.genre,
    mood: track.mood,
    has_vocals: track.has_vocals,
    has_stems: track.has_stems,
    is_public: track.is_public,
    like_count: track.like_count,
    play_count: track.play_count,
    download_count: track.download_count,
    view_count: track.view_count,
    mureka_task_id: track.mureka_task_id,
    project_id: track.project_id,
    suno_id: track.suno_id,
    model_name: track.model_name,
    created_at_suno: track.created_at_suno,
    reference_audio_url: track.reference_audio_url,
    progress_percent: track.progress_percent,
    idempotency_key: track.idempotency_key,
    archived_to_storage: track.archived_to_storage,
    storage_audio_url: track.storage_audio_url,
    storage_cover_url: track.storage_cover_url,
    storage_video_url: track.storage_video_url,
    archive_scheduled_at: track.archive_scheduled_at,
    archived_at: track.archived_at,
    metadata: track.metadata as TrackMetadata | null,
    versions: versions.map((v): TrackVersion => ({
      id: v.id,
      variant_index: v.variant_index,
      is_preferred_variant: v.is_preferred_variant,
      is_primary_variant: v.is_primary_variant,
      audio_url: v.audio_url,
      cover_url: v.cover_url,
      duration: v.duration,
      suno_id: v.suno_id,
      video_url: v.video_url,
      lyrics: v.lyrics,
      metadata: v.metadata as TrackMetadata | null,
      created_at: v.created_at,
      is_original: false,
      source_variant_index: null,
    })),
    stems: [],
    profile: null,
  };
};

/**
 * Track Service - handles all track-related operations
 */
export class TrackService {
  /**
   * Get all tracks for the current user
   *
   * @param userId - User ID to fetch tracks for
   * @returns Promise with array of tracks
   *
   * @example
   * ```typescript
   * const tracks = await TrackService.getUserTracks(userId);
   * console.log(`Found ${tracks.length} tracks`);
   * ```
   */
  static async getUserTracks(userId: string): Promise<Track[]> {
    const context = "TrackService.getUserTracks";
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select('*')
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      handlePostgrestError(error, "Failed to fetch tracks", context, { userId });

      const tracks = (data ?? []).map((row) => mapTrackRowToTrack(row as TrackRowWithVersions));

      return tracks;
    } catch (error) {
      logError('Failed to fetch tracks', error as Error, context, { userId });
      throw error;
    }
  }

  /**
   * Get a single track by its ID
   *
   * @param trackId - Track ID to fetch
   * @returns Promise with track or null if not found
   *
   * @example
   * ```typescript
   * const track = await TrackService.getById('track-123');
   * if (track) {
   *   console.log('Track title:', track.title);
   * }
   * ```
   */
  static async getById(trackId: string): Promise<Track | null> {
    const context = "TrackService.getById";
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
      return null;
    }

    return data ? mapTrackRowToTrack(data) : null;
  }

  /**
   * Delete a track
   *
   * @param trackId - Track ID to delete
   * @returns Promise that resolves when track is deleted
   *
   * @example
   * ```typescript
   * await TrackService.delete('track-123');
   * console.log('Track deleted');
   * ```
   */
  static async delete(trackId: string): Promise<void> {
    const context = "TrackService.delete";
    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId);

    handlePostgrestError(error, "Failed to delete track", context, { trackId });
  }

  /**
   * Delete a specific track version
   *
   * @param versionId - Version ID to delete
   * @returns Promise that resolves when version is deleted
   *
   * @example
   * ```typescript
   * await TrackService.deleteVersion('version-123');
   * ```
   */
  static async deleteVersion(versionId: string): Promise<void> {
    const context = "TrackService.deleteVersion";
    const { error } = await supabase
      .from('track_versions')
      .delete()
      .eq('id', versionId);

    handlePostgrestError(error, "Failed to delete version", context, { versionId });
  }

  /**
   * Delete track completely with all versions and stems (cascade)
   *
   * @param trackId - Track ID to delete completely
   * @returns Promise that resolves when track and all related data is deleted
   *
   * @example
   * ```typescript
   * await TrackService.deleteCompletely('track-123');
   * console.log('Track and all versions deleted');
   * ```
   */
  static async deleteCompletely(trackId: string): Promise<void> {
    const context = "TrackService.deleteCompletely";
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);

    handlePostgrestError(error, "Failed to delete track completely", context, { trackId });
  }

  /**
   * Update track status
   *
   * @param trackId - Track ID to update
   * @param status - New status
   * @param audioUrl - Optional audio URL
   * @param errorMessage - Optional error message
   * @returns Promise that resolves when status is updated
   *
   * @example
   * ```typescript
   * await TrackService.updateStatus('track-123', 'completed', 'https://example.com/track.mp3');
   * ```
   */
  static async updateStatus(
    trackId: string,
    status: TrackStatus,
    audioUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    const context = "TrackService.updateStatus";
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
   *
   * @param limit - Number of tracks to fetch (default: 9)
   * @param orderBy - Order by field (default: 'like_count')
   * @returns Promise with array of public tracks
   *
   * @example
   * ```typescript
   * const popularTracks = await TrackService.getPublicTracks(10, 'like_count');
   * const recentTracks = await TrackService.getPublicTracks(10, 'created_at');
   * ```
   */
  static async getPublicTracks(
    limit: number = 9,
    orderBy: 'created_at' | 'like_count' | 'view_count' = 'like_count'
  ): Promise<Track[]> {
    const context = "TrackService.getPublicTracks";
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
   *
   * @param trackId - Track ID to increment play count for
   * @returns Promise that resolves when play count is incremented
   *
   * @example
   * ```typescript
   * await TrackService.incrementPlayCount('track-123');
   * ```
   */
  static async incrementPlayCount(trackId: string): Promise<void> {
    const context = "TrackService.incrementPlayCount";
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
}
