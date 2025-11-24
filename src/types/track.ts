export interface Track {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  improved_prompt?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string | null;
  cover_url?: string | null;
  video_url?: string | null;
  suno_id?: string | null;
  model_name?: string | null;
  lyrics?: string | null;
  style_tags?: string[] | null;
  genre?: string | null;
  mood?: string | null;
  is_public?: boolean | null;
  view_count?: number | null;
  like_count?: number | null;
  play_count?: number | null;
  download_count?: number | null;
  created_at: string;
  updated_at: string;
  duration_seconds?: number | null;
  has_stems?: boolean | null;
  has_vocals?: boolean | null;
  provider: string | null;
  metadata?: Record<string, any> | null;
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
  sourceVersionNumber?: number | null;
  suno_task_id?: string;
  mureka_task_id?: string;
  selectedVersionId?: string;
  versions?: any[];
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

// Display Track type (для UI компонентов)
export interface DisplayTrack extends Track {
  isLiked?: boolean;
  isPlaying?: boolean;
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
