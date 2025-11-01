/**
 * Music Projects Types
 * Type definitions for the Projects system
 */

export type ProjectType = 'single' | 'ep' | 'album' | 'soundtrack' | 'instrumental' | 'custom';

export interface PlannedTrack {
  order: number;
  title: string;
  duration_target?: number;
  notes?: string;
  track_id?: string;
}

export interface MusicProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  persona_id: string | null;
  
  // Style and concept
  style_tags: string[] | null;
  genre: string | null;
  mood: string | null;
  tempo_range: { min: number; max: number } | null;
  concept_description: string | null;
  story_theme: string | null;
  visual_references: string[] | null;
  
  // Tracklist planning
  planned_tracks: PlannedTrack[] | null;
  
  // Metadata
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  
  // Statistics
  total_tracks: number;
  completed_tracks: number;
  total_duration: number;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  project_type: ProjectType;
  persona_id?: string;
  style_tags?: string[];
  genre?: string;
  mood?: string;
  concept_description?: string;
}

export interface UpdateProjectParams extends Partial<CreateProjectParams> {
  id: string;
}
