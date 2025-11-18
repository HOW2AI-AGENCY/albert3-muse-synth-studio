
export interface DAWProjectData {
  name: string;
  bpm: number;
  regions: any[]; // Define more specific types for regions if available
  tracks: any[]; // Define more specific types for tracks if available
  metadata?: Record<string, any>;
}

export interface DAWProject {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  data: DAWProjectData;
  bpm?: number | null;
  duration_seconds?: number | null;
  track_count?: number | null;
  thumbnail_url?: string | null;
  is_public: boolean;
  last_saved_at?: string | null;
  created_at: string;
  updated_at: string;
}
