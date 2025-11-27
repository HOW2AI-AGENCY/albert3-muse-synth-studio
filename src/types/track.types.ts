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
  suno_id?: string | null;
  video_url?: string | null;
  lyrics?: string | null;
  metadata?: TrackMetadata | null;
  created_at?: string | null;
  is_original?: boolean;
  source_variant_index?: number | null;
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
  // Legacy/compatibility fields
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
  sourceVersionNumber?: number | null;
  suno_task_id?: string | null;
}

// Display Track type (для UI компонентов)
export interface DisplayTrack extends Track {
  isLiked?: boolean;
  isPlaying?: boolean;
}

// Audio Player Track type (совместим с audioPlayerStore)
export interface AudioPlayerTrack {
  id: string;
  title: string;
  audio_url: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
  lyrics?: string;
  style_tags?: string[];
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
  sourceVersionNumber?: number | null;
  suno_task_id?: string;
  suno_id?: string;
  mureka_task_id?: string;
  selectedVersionId?: string;
  versions?: any[];
  like_count?: number;
}

// Optimized Track type (для виртуализированных списков)
export interface OptimizedTrack {
  id: string;
  title: string;
  status: Track['status'];
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  style_tags?: string[];
  version_count?: number;
}

// Track Stem interface
export interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
  version_id?: string | null;
  created_at?: string;
}
