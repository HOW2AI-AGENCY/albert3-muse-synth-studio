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
    <div className="flex items-center gap-2 p-4 border-t">
      {!isConnected ? (
        <Button onClick={onConnect} className="flex-1 touch-target-min">
          <Play className="w-4 h-4 mr-2" />
          Подключиться
        </Button>
      ) : (
        <>
          <Button 
            onClick={onDisconnect} 
            variant="destructive"
            className="flex-1 touch-target-min"
          >
            <Square className="w-4 h-4 mr-2" />
            Отключиться
          </Button>

          {!isRecording ? (
            <Button 
              onClick={onStartRecording}
              variant="secondary"
              disabled={playbackState !== 'playing'}
              className="touch-target-min"
            >
              <Mic className="w-4 h-4 mr-2" />
              Записать
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording}
              variant="destructive"
              className="touch-target-min"
            >
              <Square className="w-4 h-4 mr-2" />
              Стоп
            </Button>
          )}
        </>
      )}

      {/* Playback State Indicator */}
      <Badge variant={
        playbackState === 'playing' ? 'default' :
        playbackState === 'loading' ? 'secondary' :
        'outline'
      }>
        {playbackState === 'playing' ? '🎵 Играет' :
         playbackState === 'loading' ? '⏳ Загрузка' :
         '⏸️ Остановлено'}
      </Badge>
    </div>
  );
});

RecordingControls.displayName = 'RecordingControls';
