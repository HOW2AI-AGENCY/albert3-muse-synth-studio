// src/types/track.types.ts

/**
 * TODO: Это определение типа Track является частью большого рефакторинга
 * по выносу типов из монолитного ApiService. В будущем здесь должны появиться
 * и другие связанные типы, например, TrackVersion, Stem, Profile и т.д.
 * Это позволит улучшить структуру проекта и избежать циклических зависимостей.
 */
import type { TrackMetadata } from "@/types/track-metadata";

export interface TrackVersion {
  id: string;
  variant_index: number | null;
  audio_url: string | null;
  cover_url: string | null;
  duration: number | null;
  is_primary_variant: boolean | null;
  is_preferred_variant: boolean | null;
}

export interface Track {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  duration: number | null;
  status: 'draft' | 'processing' | 'completed' | 'failed' | 'pending';
  is_public: boolean;
  like_count: number;
  play_count: number;
  download_count: number;
  view_count: number;
  audio_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  description: string | null;
  style_tags: string[] | null;
  lyrics: string | null;
  suno_task_id: string | null;
  mureka_task_id: string | null;
  project_id: string | null;
  is_primary_variant: boolean;
  parent_track_id: string | null;
  variant_index: number | null;
  versions?: any[]; // FIXME: Заменить на TrackVersion[]
  stems?: any[]; // FIXME: Заменить на Stem[]
  profile?: any | null; // FIXME: Заменить на Profile | null
  duration_seconds: number | null;
  prompt: string | null;
  improved_prompt: string | null;
  error_message: string | null;
  provider: string | null;
  genre: string | null;
  mood: string | null;
  has_vocals: boolean | null;
  metadata: TrackMetadata | null;
  suno_id: string | null;
  model_name: string | null;
  created_at_suno: string | null;
  has_stems: boolean | null;
  reference_audio_url: string | null;
  progress_percent: number | null;
  idempotency_key: string | null;
  archived_to_storage: boolean | null;
  storage_audio_url: string | null;
  storage_cover_url: string | null;
  storage_video_url: string | null;
  archive_scheduled_at: string | null;
  archived_at: string | null;
  selectedVersionId?: string;
}
