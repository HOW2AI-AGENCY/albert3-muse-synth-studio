import { useState } from 'react';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { useTracks } from '@/hooks/useTracks';
import type { ProjectTracklistResponse } from '@/types/edge-functions';

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

      const { data, error } = await SupabaseFunctions.invoke<ProjectTracklistResponse>('generate-project-tracklist', {
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
        
        // Handle specific error codes
        const errorMessage = error.message || '';
        if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
          toast.error('Слишком много запросов', { 
            id: 'generating-tracklist',
            description: 'Подождите минуту и попробуйте снова' 
          });
        } else if (errorMessage.includes('402') || errorMessage.includes('credits')) {
          toast.error('Недостаточно AI кредитов', { 
            id: 'generating-tracklist',
            description: 'Обновите тариф в настройках подписки',
            action: {
              label: 'Обновить',
              onClick: () => window.location.href = '/workspace/subscription'
            }
          });
        } else {
          toast.error('Ошибка генерации треклиста', { id: 'generating-tracklist' });
        }
        return null;
      }

      // Refresh tracks list
      await refreshTracks();

      toast.success(`Создано ${data?.count || 0} треков для проекта`, { id: 'generating-tracklist' });
      return data?.tracks || [];
    } catch (error) {
      logger.error('Error generating tracklist', error as Error, 'useGenerateProjectTracklist');
      
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('429')) {
        toast.error('Слишком много запросов', { 
          id: 'generating-tracklist',
          description: 'Подождите минуту' 
        });
      } else if (errorMessage.includes('402')) {
        toast.error('Недостаточно кредитов', { 
          id: 'generating-tracklist',
          description: 'Обновите тариф' 
        });
      } else {
        toast.error('Произошла ошибка при генерации', { id: 'generating-tracklist' });
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTracklist, isGenerating };
};
