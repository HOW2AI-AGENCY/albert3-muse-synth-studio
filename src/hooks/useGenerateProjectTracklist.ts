import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { useTracks } from '@/hooks/useTracks';
import { logger } from '@/utils/logger';

export const useGenerateProjectTracklist = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { refreshTracks } = useTracks();

  const generateTracklist = async (project: {
    id: string;
    name: string;
    description?: string | null;
    genre?: string | null;
    mood?: string | null;
    project_type?: string | null;
    total_tracks?: number | null;
  }) => {
    setIsGenerating(true);

    try {
      toast.loading('Генерируем треклист...', { id: 'generating-tracklist' });

      const { data, error } = await supabase.functions.invoke('generate-project-tracklist', {
        body: {
          projectId: project.id,
          projectName: project.name,
          description: project.description,
          genre: project.genre,
          mood: project.mood,
          projectType: project.project_type,
          totalTracks: project.total_tracks || 10,
        },
      });

      if (error) {
        logger.error('Error generating tracklist', error, 'useGenerateProjectTracklist');
        toast.error('Ошибка генерации треклиста', { id: 'generating-tracklist' });
        return null;
      }

      // Refresh tracks list
      await refreshTracks();

      toast.success(`Создано ${data.count} треков для проекта`, { id: 'generating-tracklist' });
      return data.tracks;
    } catch (error) {
      logger.error('Error generating tracklist', error as Error, 'useGenerateProjectTracklist');
      toast.error('Произошла ошибка при генерации', { id: 'generating-tracklist' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTracklist, isGenerating };
};
