/**
 * Track Actions Component
 * Actions for draft tracks: Generate Lyrics and Generate Track
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Music } from 'lucide-react';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import type { Database } from '@/integrations/supabase/types';

type Track = Database['public']['Tables']['tracks']['Row'];

interface TrackActionsProps {
  track: Track;
  projectId: string;
  projectName?: string;
  projectGenre?: string | null;
  projectMood?: string | null;
  onLyricsGenerated?: () => void;
}

export const TrackActions: React.FC<TrackActionsProps> = ({
  track,
  projectId,
  projectName,
  projectGenre,
  projectMood,
  onLyricsGenerated,
}) => {
  const navigate = useNavigate();
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);

  // Формируем контекст для AI генерации лирики
  const getLyricsPrompt = () => {
    const parts: string[] = [];
    
    // Добавляем промпт стиля трека
    if (track.prompt) {
      parts.push(track.prompt);
    }
    
    // Добавляем контекст проекта
    if (projectName) {
      parts.push(`Проект: "${projectName}"`);
    }
    
    if (projectGenre) {
      parts.push(`Жанр: ${projectGenre}`);
    }
    
    if (projectMood) {
      parts.push(`Настроение: ${projectMood}`);
    }
    
    // Добавляем название трека
    if (track.title) {
      parts.push(`Название трека: "${track.title}"`);
    }
    
    return parts.join('. ');
  };

  const handleGenerateLyrics = () => {
    setLyricsDialogOpen(true);
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
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Создать лирику
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
        initialPrompt={getLyricsPrompt()}
        onSuccess={() => {
          setLyricsDialogOpen(false);
          onLyricsGenerated?.();
        }}
      />
    </>
  );
};
