import { createContext } from 'react';
import type { Database } from '@/integrations/supabase/types';

export type MusicProject = Database['public']['Tables']['music_projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['music_projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['music_projects']['Update'];

export interface ProjectContextValue {
  selectedProject: MusicProject | null;
  setSelectedProject: (project: MusicProject | null) => void;
  projects: MusicProject[];
  isLoading: boolean;
  createProject: (params: ProjectInsert) => Promise<MusicProject | null>;
  updateProject: (id: string, params: ProjectUpdate) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);