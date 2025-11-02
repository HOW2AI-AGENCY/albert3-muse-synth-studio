/**
 * Hook for creating projects with draft tracks
 * Materializes planned_tracks into actual track records
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { PlannedTrack } from '@/types/project.types';

interface CreateProjectWithTracksParams {
  projectData: {
    name: string;
    description?: string;
    project_type: string;
    genre?: string;
    mood?: string;
    style_tags?: string[];
    concept_description?: string;
    story_theme?: string;
    tempo_range?: { min: number; max: number };
    planned_tracks?: PlannedTrack[];
  };
  onSuccess?: (projectId: string) => void;
}

export const useCreateProjectWithTracks = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createProjectWithTracks = async ({ projectData, onSuccess }: CreateProjectWithTracksParams) => {
    setIsCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      logger.info('Creating project with tracks', 'useCreateProjectWithTracks', { 
        name: projectData.name,
        trackCount: projectData.planned_tracks?.length || 0
      });

      // Step 1: Create the project
      const { data: project, error: projectError } = await supabase
        .from('music_projects')
        .insert({
          user_id: user.id,
          name: projectData.name,
          description: projectData.description,
          project_type: projectData.project_type as any,
          genre: projectData.genre,
          mood: projectData.mood,
          style_tags: projectData.style_tags,
          concept_description: projectData.concept_description,
          story_theme: projectData.story_theme,
          tempo_range: projectData.tempo_range as any,
          planned_tracks: projectData.planned_tracks as any,
          total_tracks: projectData.planned_tracks?.length || 0,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      logger.info('Project created', 'useCreateProjectWithTracks', { projectId: project.id });

      // Step 2: Create draft tracks if planned_tracks exist
      if (projectData.planned_tracks && projectData.planned_tracks.length > 0) {
        const tracksToCreate = projectData.planned_tracks.map((plannedTrack) => ({
          user_id: user.id,
          project_id: project.id,
          title: plannedTrack.title,
          prompt: plannedTrack.style_prompt || `${projectData.genre || ''} ${projectData.mood || ''} music`,
          status: 'draft',
          provider: 'manual',
          has_vocals: true,
          style_tags: projectData.style_tags,
          genre: projectData.genre,
          mood: projectData.mood,
          metadata: {
            planned_order: plannedTrack.order,
            duration_target: plannedTrack.duration_target,
            notes: plannedTrack.notes,
          },
        }));

        const { error: tracksError } = await supabase
          .from('tracks')
          .insert(tracksToCreate);

        if (tracksError) {
          logger.error('Failed to create draft tracks', tracksError as Error, 'useCreateProjectWithTracks');
          // Don't throw - project is already created
          toast({
            title: 'Предупреждение',
            description: 'Проект создан, но не удалось создать черновики треков',
            variant: 'destructive',
          });
        } else {
          logger.info('Draft tracks created', 'useCreateProjectWithTracks', { 
            count: tracksToCreate.length 
          });
        }
      }

      toast({
        title: 'Проект создан',
        description: `"${project.name}" успешно создан с ${projectData.planned_tracks?.length || 0} черновиками треков`,
      });

      onSuccess?.(project.id);
      return project;
    } catch (error) {
      logger.error('Failed to create project', error as Error, 'useCreateProjectWithTracks');
      toast({
        title: 'Ошибка создания',
        description: 'Не удалось создать проект',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createProjectWithTracks,
    isCreating,
  };
};
