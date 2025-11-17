/**
 * Track Actions Component
 * Actions for draft tracks: Generate Lyrics and Generate Track
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Music, FileText } from 'lucide-react';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { TrackLyricsViewDialog } from '@/components/lyrics/TrackLyricsViewDialog';
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
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [lyricsViewOpen, setLyricsViewOpen] = useState(false);

  // Формируем промпт на основе контекста проекта и трека
  const getLyricsPrompt = () => {
    const parts: string[] = [];
    
    // Добавляем контекст проекта
    if (projectName) {
      parts.push(`Проект: "${projectName}"`);
    }
    
    if (projectDescription) {
      parts.push(`Концепция: ${projectDescription}`);
    }
    
    if (projectGenre) {
      parts.push(`Жанр: ${projectGenre}`);
    }
    
    if (projectMood) {
      parts.push(`Настроение: ${projectMood}`);
    }
    
    // Добавляем контекст трека
    if (track.title) {
      parts.push(`Трек: "${track.title}"`);
    }
    
    if (track.prompt) {
      parts.push(`Стиль: ${track.prompt}`);
    }
    
    return parts.join('. ');
  };

  const handleLyricsClick = () => {
    if (track.lyrics) {
      // Если лирика есть, открываем просмотр
      setLyricsViewOpen(true);
    } else {
      // Если лирики нет, открываем генератор
      setLyricsDialogOpen(true);
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
      <div className="flex gap-2 mt-2 flex-wrap">
        <Button 
          size="sm" 
          variant={track.lyrics ? "default" : "outline"}
          onClick={handleLyricsClick}
          className="transition-all touch-target-optimal min-h-[44px] px-4"
        >
          {track.lyrics ? (
            <>
              <FileText className="h-4 w-4 mr-2" />
              <span className="text-sm">Просмотр лирики</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm">Создать лирику</span>
            </>
          )}
        </Button>
        <Button 
          size="sm"
          onClick={handleGenerateTrack}
          className="touch-target-optimal min-h-[44px] px-4"
        >
          <Music className="h-4 w-4 mr-2" />
          <span className="text-sm">Сгенерировать</span>
        </Button>
      </div>

      <LyricsGeneratorDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        trackId={track.id}
        initialPrompt={getLyricsPrompt()}
        onGenerated={() => {
          onLyricsGenerated?.();
        }}
      />

      <TrackLyricsViewDialog
        open={lyricsViewOpen}
        onOpenChange={setLyricsViewOpen}
        track={track}
        onLyricsUpdated={onLyricsGenerated}
      />
    </>
  );
};
