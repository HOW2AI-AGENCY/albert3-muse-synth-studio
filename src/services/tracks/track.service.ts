import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handlePostgrestError } from "@/services/api/errors";
import { logError, logWarn } from "@/utils/logger";
import {
    type Track,
    type TrackVersion,
    type DatabaseTrack,
    trackConverters
} from "@/types/domain/track.types";

export type { Track, TrackVersion };

export type TrackStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'error';
export type TrackRowWithVersions = DatabaseTrack & {
  track_versions: Database["public"]["Tables"]["track_versions"]["Row"][];
};

export const mapTrackRowToTrack = (row: DatabaseTrack): Track => {
    return trackConverters.toDomain(row);
  };

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];

export class TrackService {
  /**
   * Get all tracks for the current user with caching support
   */
  static async getUserTracks(userId: string): Promise<Track[]> {
    const context = "TrackService.getUserTracks";
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          track_versions ( * )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      handlePostgrestError(error, "Failed to fetch tracks", context, { userId });

      const tracks = (data ?? []).map((row) => mapTrackRowToTrack(row as DatabaseTrack));
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
    const context = "TrackService.getTrackById";
    const { data, error } = await supabase
      .from('tracks')
      .select('*, track_versions ( * )')
      .eq('id', trackId)
      .single();

    if (error) {
      logError('Failed to fetch track by ID', new Error(error.message), context, {
        trackId,
        details: error.details,
      });
      return null;
    }

    return data ? mapTrackRowToTrack(data as DatabaseTrack) : null;
  }

  /**
   * Delete a track with cache cleanup
   */
  static async deleteTrack(trackId: string): Promise<void> {
    const context = "TrackService.deleteTrack";
    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId);

    handlePostgrestError(error, "Failed to delete track", context, { trackId });
  }

    /**
   * Delete a specific track version
   */
    static async deleteTrackVersion(versionId: string): Promise<void> {
        const context = "TrackService.deleteTrackVersion";
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
        const context = "TrackService.deleteTrackCompletely";
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
    const context = "TrackService.updateTrackStatus";
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
    const context = "TrackService.getPublicTracks";
    const { data, error } = await supabase
      .from("tracks")
      .select("*, track_versions ( * )")
      .eq("is_public", true)
      .eq("status", "completed")
      .not("audio_url", "is", null)
      .order(orderBy, { ascending: false })
      .limit(limit);

    handlePostgrestError(error, "Failed to fetch public tracks", context, {
      limit,
      orderBy,
    });

    return (data ?? []).map(row => mapTrackRowToTrack(row as DatabaseTrack));
  }

  /**
   * Increment play count for a track
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
