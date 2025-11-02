import { memo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PromptDjMidi } from './PromptDjMidi';
import { RecordingControls } from './RecordingControls';
import { usePromptDj } from '@/hooks/prompt-dj/usePromptDj';

interface PromptDjDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSampleCreated?: (url: string, fileName: string) => void;
}

export const PromptDjDialog = memo(({
  open,
  onOpenChange,
  onSampleCreated,
}: PromptDjDialogProps) => {
  const { 
    prompts, 
    audioLevels, 
    updatePrompts,
    connect,
    disconnect,
    isConnected,
    playbackState,
    isRecording,
    startRecording,
    stopRecording,
    saveRecording,
  } = usePromptDj();

  const handleSave = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob) return;

    const fileName = `prompt-dj-${Date.now()}.webm`;
    const url = await saveRecording(blob, fileName);

    if (url) {
      onSampleCreated?.(url, fileName);
      onOpenChange(false);
    }
  }, [stopRecording, saveRecording, onSampleCreated, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>🎛️ Prompt DJ - Создание сэмплов</DialogTitle>
          <DialogDescription>
            Управляйте 16 промптами для генерации музыки в реальном времени
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <PromptDjMidi
            initialPrompts={prompts}
            audioLevels={audioLevels}
            onPromptsChange={updatePrompts}
          />
        </ScrollArea>

        <RecordingControls
          isConnected={isConnected}
          isRecording={isRecording}
          playbackState={playbackState}
          onConnect={connect}
          onDisconnect={disconnect}
          onStartRecording={startRecording}
          onStopRecording={handleSave}
        />
      </DialogContent>
    </Dialog>
  );
});

PromptDjDialog.displayName = 'PromptDjDialog';
