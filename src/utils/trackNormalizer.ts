/**
 * Track Normalizer
 * Утилиты для нормализации треков - преобразование null в undefined для компонентов
 */

import type { Track as ApiTrack } from '@/services/api.service';

/**
 * Нормализует трек из API формата в формат компонентов
 * Преобразует все null значения в undefined
 */
export const normalizeTrack = <T extends ApiTrack>(track: T): Omit<T, 'audio_url' | 'cover_url' | 'video_url' | 'duration' | 'duration_seconds' | 'style_tags' | 'lyrics' | 'has_vocals' | 'genre' | 'mood' | 'like_count' | 'view_count' | 'has_stems' | 'suno_id' | 'model_name' | 'improved_prompt' | 'download_count' | 'play_count' | 'is_public'> & {
  audio_url?: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
  duration_seconds?: number;
  style_tags?: string[];
  lyrics?: string;
  has_vocals?: boolean;
  genre?: string;
  mood?: string;
  like_count?: number;
  view_count?: number;
  has_stems?: boolean;
  suno_id?: string;
  model_name?: string;
  improved_prompt?: string;
  download_count?: number;
  play_count?: number;
  is_public?: boolean;
} => {
  return {
    ...track,
    audio_url: track.audio_url ?? undefined,
    cover_url: track.cover_url ?? undefined,
    video_url: track.video_url ?? undefined,
    duration: track.duration ?? undefined,
    duration_seconds: track.duration_seconds ?? undefined,
    style_tags: track.style_tags ?? undefined,
    lyrics: track.lyrics ?? undefined,
    has_vocals: track.has_vocals ?? undefined,
    genre: track.genre ?? undefined,
    mood: track.mood ?? undefined,
    like_count: track.like_count ?? undefined,
    view_count: track.view_count ?? undefined,
    has_stems: track.has_stems ?? undefined,
    suno_id: track.suno_id ?? undefined,
    model_name: track.model_name ?? undefined,
    improved_prompt: track.improved_prompt ?? undefined,
    download_count: track.download_count ?? undefined,
    play_count: track.play_count ?? undefined,
    is_public: track.is_public ?? undefined,
  };
};

/**
 * Массовая нормализация треков
 */
export const normalizeTracks = <T extends ApiTrack>(tracks: T[]) => {
  return tracks.map(normalizeTrack);
};
