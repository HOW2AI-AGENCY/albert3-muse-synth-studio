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
  onLyricsGenerated?: () => void;
}

export const TrackActions: React.FC<TrackActionsProps> = ({
  track,
  projectId,
  onLyricsGenerated,
}) => {
  const navigate = useNavigate();
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);

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
        onSuccess={() => {
          setLyricsDialogOpen(false);
          onLyricsGenerated?.();
        }}
      />
    </>
  );
};
