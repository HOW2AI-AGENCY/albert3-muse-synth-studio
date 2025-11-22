// src/types/track.types.ts

/**
 * Single Source of Truth for Track types
 * Consolidated from multiple definitions to prevent type conflicts
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
  prompt: string;
  improved_prompt: string | null;
  status: 'draft' | 'processing' | 'completed' | 'failed' | 'pending';
  audio_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  style_tags: string[] | null;
  lyrics: string | null;
  duration: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  provider: string | null;
  genre: string | null;
  mood: string | null;
  has_vocals: boolean | null;
  has_stems: boolean | null;
  is_public: boolean | null;
  like_count: number | null;
  play_count: number | null;
  download_count: number | null;
  view_count: number | null;
  mureka_task_id: string | null;
  project_id: string | null;
  suno_id: string | null;
  model_name: string | null;
  created_at_suno: string | null;
  reference_audio_url: string | null;
  progress_percent: number | null;
  idempotency_key: string | null;
  archived_to_storage: boolean | null;
  storage_audio_url: string | null;
  storage_cover_url: string | null;
  storage_video_url: string | null;
  archive_scheduled_at: string | null;
  archived_at: string | null;
  metadata: TrackMetadata | null;
  versions?: TrackVersion[];
  stems?: any[];
  profile?: any | null;
  selectedVersionId?: string;
}
