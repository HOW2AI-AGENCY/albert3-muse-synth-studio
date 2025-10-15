import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UseStemReferenceOptions {
  onReferenceSet?: (audioUrl: string, stemType: string) => void;
}

export const useStemReference = (options?: UseStemReferenceOptions) => {
  const navigate = useNavigate();

  const setReferenceFromStem = useCallback(async (audioUrl: string, stemType: string, trackId: string) => {
    try {
      // Получаем информацию о треке для извлечения стиля и текста
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: track } = await supabase
        .from('tracks')
        .select('prompt, lyrics, style_tags, provider, title')
        .eq('id', trackId)
        .single();

      if (track) {
        // Сохраняем референс в localStorage для передачи в генератор
        const referenceData = {
          audioUrl,
          stemType,
          trackId,
          prompt: track.prompt,
          lyrics: track.lyrics,
          styleTags: track.style_tags,
          title: track.title,
          timestamp: Date.now()
        };

        localStorage.setItem('pendingStemReference', JSON.stringify(referenceData));

        // Переходим на страницу генератора
        navigate('/workspace/generate');

        toast.success(`Стем "${stemType}" установлен как референс`, {
          description: 'Расширенная форма настроена автоматически',
        });

        options?.onReferenceSet?.(audioUrl, stemType);
      }
    } catch (error) {
      console.error('Failed to set reference from stem:', error);
      toast.error('Не удалось установить референс');
    }
  }, [navigate, options]);

  return { setReferenceFromStem };
};
