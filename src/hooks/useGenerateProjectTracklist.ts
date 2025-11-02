import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGenerateProjectTracklist = () => {
  const [isGenerating, setIsGenerating] = useState(false);

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
        console.error('Error generating tracklist:', error);
        toast.error('Ошибка генерации треклиста');
        return null;
      }

      toast.success(`Создано ${data.count} треков для проекта`);
      return data.tracks;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Произошла ошибка при генерации');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTracklist, isGenerating };
};
