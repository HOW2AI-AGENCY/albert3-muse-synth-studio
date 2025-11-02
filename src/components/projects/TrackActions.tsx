/**
 * Track Actions Component
 * Actions for draft tracks: Generate Lyrics and Generate Track
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Music, Loader2 } from 'lucide-react';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Track = Database['public']['Tables']['tracks']['Row'];

interface TrackActionsProps {
  track: Track;
  projectId: string;
  projectName?: string;
  projectDescription?: string | null;
  projectGenre?: string | null;
  projectMood?: string | null;
  onLyricsGenerated?: () => void;
}

export const TrackActions: React.FC<TrackActionsProps> = ({
  track,
  projectId,
  projectName,
  projectDescription,
  projectGenre,
  projectMood,
  onLyricsGenerated,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  const handleGenerateLyrics = async () => {
    setIsGeneratingPrompt(true);
    
    try {
      // Вызываем Edge Function для генерации промпта
      const { data, error } = await supabase.functions.invoke('generate-lyrics-prompt', {
        body: {
          projectName,
          projectDescription,
          projectGenre,
          projectMood,
          trackTitle: track.title,
          trackStylePrompt: track.prompt,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('лимит')) {
          toast({
            title: 'Лимит запросов',
            description: 'Превышен лимит запросов к AI. Попробуйте позже.',
            variant: 'destructive',
          });
        } else if (data.error.includes('кредитов')) {
          toast({
            title: 'Недостаточно кредитов',
            description: 'Пополните баланс Lovable AI.',
            variant: 'destructive',
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      // Устанавливаем сгенерированный промпт
      setGeneratedPrompt(data.prompt);
      setLyricsDialogOpen(true);

      toast({
        title: '✨ Промпт готов',
        description: 'AI создал промпт на основе контекста проекта',
      });
    } catch (error) {
      console.error('Error generating lyrics prompt:', error);
      toast({
        title: 'Ошибка генерации промпта',
        description: 'Не удалось создать промпт. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateTrack = () => {
    // Navigate to generator with pre-filled data via React Router state
    navigate('/workspace/generate', {
      state: {
        projectId,
        trackId: track.id,
        autoFill: true,
      },
    });
  };

  // Show actions for non-completed tracks (pending, processing, or manual/draft)
  if (track.status === 'completed' || track.status === 'failed') {
    return null;
  }

  return (
    <>
      <div className="flex gap-2 mt-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleGenerateLyrics}
          disabled={isGeneratingPrompt}
        >
          {isGeneratingPrompt ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1" />
          )}
          {isGeneratingPrompt ? 'Создаём промпт...' : 'Создать лирику'}
        </Button>
        <Button 
          size="sm"
          onClick={handleGenerateTrack}
        >
          <Music className="h-3 w-3 mr-1" />
          Сгенерировать
        </Button>
      </div>

      <LyricsGeneratorDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        trackId={track.id}
        initialPrompt={generatedPrompt}
        onSuccess={() => {
          setLyricsDialogOpen(false);
          setGeneratedPrompt('');
          onLyricsGenerated?.();
        }}
      />
    </>
  );
};
