/**
 * Hook for DAW Project persistence
 * Auto-save, load, and manage DAW projects in Supabase
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDAWStore } from '@/stores/dawStore';
import { toast } from 'sonner';
import { logError, logInfo } from '@/utils/logger';
import type { DAWProject } from '@/stores/dawStore';

interface DAWProjectRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  data: DAWProject;
  thumbnail_url?: string;
  bpm: number;
  duration_seconds?: number;
  track_count: number;
  is_public: boolean;
  last_saved_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to manage DAW projects in Supabase
 */
export const useDAWProjects = () => {
  const queryClient = useQueryClient();
  const project = useDAWStore((state) => state.project);

  // Fetch user's DAW projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['daw-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daw_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as DAWProjectRecord[];
    },
  });

  // Save DAW project
  const saveMutation = useMutation({
    mutationFn: async (options: { projectId?: string; description?: string } = {}) => {
      if (!project) throw new Error('No project to save');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const record: any = {
        user_id: user.id,
        name: project.name || 'Untitled Project',
        description: options.description,
        data: project,
        bpm: project.bpm,
        duration_seconds: project.tracks.reduce((sum, track) => {
          const trackDuration = track.clips.reduce((max, clip) => 
            Math.max(max, clip.startTime + clip.duration), 0
          );
          return Math.max(sum, trackDuration);
        }, 0),
        track_count: project.tracks.length,
        is_public: false,
        last_saved_at: new Date().toISOString(),
      };

      // Upsert (update if exists, insert if new)
      if (options.projectId) {
        const { data, error } = await supabase
          .from('daw_projects')
          .update(record)
          .eq('id', options.projectId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('daw_projects')
          .insert(record)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daw-projects'] });
      logInfo('DAW project saved', 'useDAWProjects', { projectId: data.id });
      toast.success('Проект сохранен');
    },
    onError: (error) => {
      logError('Failed to save DAW project', error as Error, 'useDAWProjects');
      toast.error('Ошибка сохранения проекта');
    },
  });

  // Load DAW project
  const loadMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase
        .from('daw_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as unknown as DAWProjectRecord;
    },
    onSuccess: (data) => {
      // Load project into DAW store
      const dawStore = useDAWStore.getState();
      dawStore.loadProject(data.data);

      logInfo('DAW project loaded', 'useDAWProjects', { projectId: data.id });
      toast.success(`Проект "${data.name}" загружен`);
    },
    onError: (error) => {
      logError('Failed to load DAW project', error as Error, 'useDAWProjects');
      toast.error('Ошибка загрузки проекта');
    },
  });

  // Delete DAW project
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('daw_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daw-projects'] });
      toast.success('Проект удален');
    },
    onError: (error) => {
      logError('Failed to delete DAW project', error as Error, 'useDAWProjects');
      toast.error('Ошибка удаления проекта');
    },
  });

  return {
    projects,
    isLoading,
    saveProject: saveMutation.mutate,
    loadProject: loadMutation.mutate,
    deleteProject: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
    isLoadingProject: loadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
