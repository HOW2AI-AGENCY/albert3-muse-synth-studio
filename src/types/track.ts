/**
 * Централизованные типы для треков
 * Этот файл содержит все интерфейсы, связанные с треками, для обеспечения консистентности
 */

// Базовый интерфейс трека из API
export interface BaseTrack {
  id: string;
  title: string;
  audio_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  prompt: string;
  improved_prompt: string | null;
  duration: number | null;
  duration_seconds: number | null;
  error_message?: string | null;
  cover_url: string | null;
  video_url: string | null;
  suno_id: string | null;
  model_name: string | null;
  created_at_suno: string | null;
  lyrics: string | null;
  style_tags: string[] | null;
  has_vocals: boolean | null;
  has_stems?: boolean | null;
  like_count?: number | null;
  view_count?: number | null;
}

// Трек для аудиоплеера (требует обязательный audio_url)
export interface AudioPlayerTrack {
  id: string;
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
  title: string;
  audio_url: string; // Обязательное поле для плеера
  cover_url?: string;
  duration?: number;
  style_tags?: string[];
  lyrics?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed'; // Track status for playback validation
}

// Трек для отображения в списках (может не иметь audio_url)
export interface DisplayTrack {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  style_tags?: string[];
  duration_seconds?: number;
  status: string;
  like_count?: number;
  has_stems?: boolean;
  prompt?: string;
  created_at?: string;
  duration?: number;
}

// Упрощенный трек для оптимизированных списков
export interface OptimizedTrack {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  style_tags?: string[];
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: number;
  duration_seconds?: number;
  like_count?: number;
  has_stems?: boolean;
}

// Версия трека
export interface TrackVersion {
  id: string;
  version_number: number;
  is_master: boolean | null;
  suno_id: string | null;
  audio_url: string | null;
  video_url?: string | null;
  cover_url?: string | null;
  lyrics?: string | null;
  duration?: number | null;
  metadata?: Record<string, unknown>;
}

// Стем трека
export interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
}

// Лайкнутый трек
export interface LikedTrack {
  id: string;
  title: string;
  audio_url: string | null;
  cover_url: string | null;
  duration: number | null;
  style_tags: string[] | null;
  status: string;
  user_id: string;
  created_at: string;
  like_count: number | null;
  view_count: number | null;
}

// Кэшированный трек
export interface CachedTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  image_url?: string;
  duration?: number;
  genre?: string;
  created_at: string;
  cached_at: number;
}

// Трек с версиями
export interface TrackWithVersions extends BaseTrack {
  versions: TrackVersion[];
  stems?: TrackStem[];
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
}

// Утилитарные типы для преобразования
export type TrackStatus = 'pending' | 'processing' | 'completed' | 'failed';

type ConvertibleTrack = {
  id: string;
  title: string;
  audio_url?: string | null;
  cover_url?: string | null;
  duration?: number | null;
  duration_seconds?: number | null;
  style_tags?: string[] | null;
  lyrics?: string | null;
  status?: string | null;
};

// Функции-хелперы для преобразования типов
export const convertToAudioPlayerTrack = (track: ConvertibleTrack): AudioPlayerTrack | null => {
  if (!track.audio_url) return null;

  return {
    id: track.id,
    title: track.title,
    audio_url: track.audio_url,
    cover_url: track.cover_url || undefined,
    duration: track.duration || track.duration_seconds || undefined,
    style_tags: track.style_tags || undefined,
    lyrics: track.lyrics || undefined,
    status: track.status as TrackStatus | undefined,
  };
};

export const convertToDisplayTrack = (track: BaseTrack): DisplayTrack => {
  return {
    id: track.id,
    title: track.title,
    audio_url: track.audio_url || undefined,
    cover_url: track.cover_url || undefined,
    style_tags: track.style_tags || undefined,
    duration_seconds: track.duration_seconds || undefined,
    status: track.status,
    like_count: track.like_count ?? undefined,
    has_stems: track.has_stems ?? undefined,
    prompt: track.prompt,
    created_at: track.created_at,
    duration: track.duration || undefined,
  };
};

export const convertToOptimizedTrack = (track: BaseTrack | DisplayTrack): OptimizedTrack => {
  return {
    id: track.id,
    title: track.title,
    audio_url: track.audio_url || undefined,
    cover_url: track.cover_url || undefined,
    style_tags: track.style_tags || undefined,
    status: 'status' in track ? track.status as TrackStatus : undefined,
    duration: track.duration || track.duration_seconds || undefined,
    duration_seconds: track.duration_seconds || track.duration || undefined,
    like_count: track.like_count || 0,
    has_stems: track.has_stems || false,
  };
};