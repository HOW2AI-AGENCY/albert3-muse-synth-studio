import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Mic } from 'lucide-react';
import type { PlaybackState } from './types';

interface RecordingControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  playbackState: PlaybackState;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const RecordingControls = memo(({
  isConnected,
  isRecording,
  playbackState,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
}: RecordingControlsProps) => {
  return (
    <div className="flex items-center gap-3 p-4">
      {!isConnected ? (
        <Button 
          onClick={onConnect} 
          className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity touch-optimized"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          Подключиться
        </Button>
      ) : (
        <>
          <Button 
            onClick={onDisconnect} 
            variant="destructive"
            className="flex-1 touch-optimized"
            size="lg"
          >
            <Square className="w-4 h-4 mr-2" />
            Отключиться
          </Button>

          {!isRecording ? (
            <Button 
              onClick={onStartRecording}
              variant="secondary"
              disabled={playbackState !== 'playing'}
              className="touch-optimized"
              size="lg"
            >
              <Mic className="w-4 h-4 mr-2" />
              Записать
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording}
              variant="destructive"
              className="touch-optimized animate-pulse"
              size="lg"
            >
              <Square className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          )}
        </>
      )}

      {/* Playback State Indicator */}
      <Badge 
        variant={
          playbackState === 'playing' ? 'default' :
          playbackState === 'loading' ? 'secondary' :
          'outline'
        }
        className="text-sm px-3 py-1.5"
      >
        {playbackState === 'playing' ? '🎵 Играет' :
         playbackState === 'loading' ? '⏳ Загрузка' :
         '⏸️ Остановлено'}
      </Badge>
    </div>
  );
});

RecordingControls.displayName = 'RecordingControls';
