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
  audio_url?: string | null | undefined;
  cover_url?: string | null | undefined;
  video_url?: string | null | undefined;
  description?: string | null | undefined;
  style_tags?: string[] | null | undefined;
  lyrics?: string | null | undefined;
  suno_task_id?: string | null | undefined;
  mureka_task_id?: string | null | undefined;
  project_id?: string | null | undefined;
  is_primary_variant: boolean;
  parent_track_id?: string | null | undefined;
  variant_index?: number | null | undefined;
  versions?: any[];
  stems?: any[];
  profile?: any | null;
  duration_seconds?: number | null | undefined;
  prompt?: string | null | undefined;
  improved_prompt?: string | null | undefined;
  error_message?: string | null | undefined;
  provider?: string | null | undefined;
  genre?: string | null | undefined;
  mood?: string | null | undefined;
  has_vocals?: boolean | null | undefined;
  metadata?: TrackMetadata | null | undefined;
  suno_id?: string | null | undefined;
  model_name?: string | null | undefined;
  created_at_suno?: string | null | undefined;
  has_stems?: boolean | null | undefined;
  reference_audio_url?: string | null | undefined;
  progress_percent?: number | null | undefined;
  idempotency_key?: string | null | undefined;
  archived_to_storage?: boolean | null | undefined;
  storage_audio_url?: string | null | undefined;
  storage_cover_url?: string | null | undefined;
  storage_video_url?: string | null | undefined;
  archive_scheduled_at?: string | null | undefined;
  archived_at?: string | null | undefined;
  selectedVersionId?: string;
}
