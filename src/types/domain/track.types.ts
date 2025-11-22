/**
 * 🔒 DEPRECATED: Use @/types/track.types.ts instead
 * This file is kept for backward compatibility only
 */

export type { Track, TrackVersion } from '@/types/track.types';
export type { Track as DisplayTrack } from '@/types/track.types';

/**
 * Track model for audio player
 */
export interface AudioPlayerTrack {
  id: string;
  title: string;
  audio_url: string;
  cover_url?: string | null | undefined;
  duration?: number | null | undefined;
  artist?: string;
  status?: string;
  style_tags?: string[];
  lyrics?: string;
  suno_id?: string;
  suno_task_id?: string;
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
}

/**
 * Track version (variant)
 */
export interface TrackVersion {
  id: string;
  parent_track_id: string;
  variant_index: number;
  is_primary_variant: boolean | null;
  is_preferred_variant: boolean | null;
  audio_url?: string | null;
  cover_url?: string | null;
  video_url?: string | null;
  lyrics?: string | null;
  duration?: number | null;
  suno_id?: string | null;
  metadata?: TrackMetadata | null;
  created_at: string;
}

/**
 * Structured metadata for a track
 */
export interface TrackMetadata {
  provider_task_id?: string;
  provider_response?: unknown;
  reference_audio_url?: string;
  [key: string]: unknown; // Allow other unknown properties
}

/**
 * Track stem (separated audio)
 */
export interface TrackStem {
  id: string;
  track_id: string;
  version_id?: string | null;
  stem_type: string;
  separation_mode: string;
  audio_url: string;
  suno_task_id?: string | null;
  metadata?: TrackMetadata | null;
  created_at: string;
}

/**
 * Track filters for querying
 */
export interface TrackFilters {
  provider?: string;
  status?: string;
  has_vocals?: boolean;
  is_public?: boolean;
  genre?: string;
  mood?: string;
  search?: string;
  sortBy?: 'created_at' | 'play_count' | 'like_count' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Conversion utilities
 */
export const trackConverters = {
  /**
   * Convert database track to domain track
   */
  toDomain(dbTrack: DatabaseTrack): Track {
    return {
      ...dbTrack,
      has_vocals: dbTrack.has_vocals ?? false,
      has_stems: dbTrack.has_stems ?? false,
      is_public: dbTrack.is_public ?? false,
      play_count: dbTrack.play_count ?? 0,
      like_count: dbTrack.like_count ?? 0,
      download_count: dbTrack.download_count ?? 0,
      view_count: dbTrack.view_count ?? 0,
      provider: dbTrack.provider ?? 'suno',
      status: dbTrack.status ?? 'pending',
      metadata: dbTrack.metadata as TrackMetadata | null,
    };
  },

  /**
   * Convert domain track to display track
   */
  toDisplay(track: Track, options: { isLiked?: boolean; isPlaying?: boolean } = {}): DisplayTrack {
    return {
      ...track,
      isLiked: options.isLiked,
      isPlaying: options.isPlaying,
      formattedDuration: track.duration_seconds ? formatDuration(track.duration_seconds) : undefined,
      formattedDate: formatDate(track.created_at),
      genreLabel: track.genre || 'Unknown',
    };
  },

  /**
   * Convert track to audio player track
   */
  toAudioPlayer(track: Track): AudioPlayerTrack | null {
    if (!track.audio_url) return null;

    return {
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
      cover_url: track.cover_url || undefined,
      duration: track.duration_seconds || undefined,
    };
  },
};

/**
 * Helper: Format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper: Format date to human-readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} дн назад`;

  return date.toLocaleDateString('ru-RU');
}
