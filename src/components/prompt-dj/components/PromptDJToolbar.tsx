import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Download } from 'lucide-react';
import { PresetManager, Preset } from './PresetManager';
import { RecordingState } from '@/utils/PromptDJHelper';
import { cn } from '@/lib/utils';

interface PromptDJToolbarProps {
  presets: Preset[];
  onSelectPreset: (preset: Preset) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  recordingState: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  lastRecordingUrl: string | null;
  onUseAsReference: () => void;
}

export const PromptDJToolbar: React.FC<PromptDJToolbarProps> = ({
  presets,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  recordingState,
  onStartRecording,
  onStopRecording,
  lastRecordingUrl,
  onUseAsReference,
}) => {
  const isRecording = recordingState === 'recording';
  const isEncoding = recordingState === 'encoding';

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-card border rounded-lg">
      <div className="w-full md:w-auto">
        <PresetManager
          presets={presets}
          onSelectPreset={onSelectPreset}
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={isRecording ? 'destructive' : 'outline'}
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isEncoding}
          className="w-32"
        >
          {isEncoding ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : isRecording ? (
            <StopCircle className="h-4 w-4 mr-2" />
          ) : (
            <Mic className="h-4 w-4 mr-2" />
          )}
          <span>{isEncoding ? 'Обработка' : isRecording ? 'Стоп' : 'Запись'}</span>
        </Button>

        {lastRecordingUrl && (
          <>
            <Button asChild variant="secondary">
              <a href={lastRecordingUrl} download="prompt-dj-session.wav">
                <Download className="h-4 w-4 mr-2" />
                Скачать
              </a>
            </Button>
          <Button variant="outline" onClick={onUseAsReference}>
              Использовать как референс
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
