/**
 * 🔒 DEPRECATED: Use @/types/track.types.ts instead
 * This file is kept for backward compatibility only
 */

export type { Track, TrackVersion } from '@/types/track.types';

// DisplayTrack is just Track with optional UI properties
import type { Track as BaseTrack } from '@/types/track.types';

// Re-export DisplayTrack from single source
export type { DisplayTrack } from '@/types/track.types';

// Re-export AudioPlayerTrack from single source
export type { AudioPlayerTrack } from '@/types/track.types';

export interface TrackMetadata {
  provider_task_id?: string;
  provider_response?: unknown;
  reference_audio_url?: string;
  [key: string]: unknown;
}

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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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

export const trackConverters = {
  toDomain(dbTrack: any): BaseTrack {
    return {
      ...dbTrack,
      has_vocals: dbTrack.has_vocals ?? null,
      has_stems: dbTrack.has_stems ?? null,
      is_public: dbTrack.is_public ?? null,
      play_count: dbTrack.play_count ?? null,
      like_count: dbTrack.like_count ?? null,
      download_count: dbTrack.download_count ?? null,
      view_count: dbTrack.view_count ?? null,
      provider: dbTrack.provider ?? null,
      status: dbTrack.status ?? 'pending',
      metadata: dbTrack.metadata as TrackMetadata | null,
    };
  },

  toDisplay(track: BaseTrack, options: { isLiked?: boolean; isPlaying?: boolean } = {}) {
    return {
      ...track,
      isLiked: options.isLiked,
      isPlaying: options.isPlaying,
      formattedDuration: track.duration_seconds ? formatDuration(track.duration_seconds) : undefined,
      formattedDate: formatDate(track.created_at),
      genreLabel: track.genre || 'Unknown',
    };
  },

  toAudioPlayer(track: BaseTrack) {
    if (!track.audio_url) return null;

    return {
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
      cover_url: track.cover_url ?? undefined,
      duration: track.duration_seconds ?? undefined,
      status: track.status,
      style_tags: track.style_tags ?? undefined,
      lyrics: track.lyrics ?? undefined,
      suno_id: track.suno_id ?? undefined,
      mureka_task_id: track.mureka_task_id ?? undefined,
    };
  },
};
