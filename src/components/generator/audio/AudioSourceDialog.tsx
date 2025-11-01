import { memo, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, Mic, FolderOpen, Music } from 'lucide-react';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useToast } from '@/hooks/use-toast';
import { ReferenceAudioLibraryInline } from './ReferenceAudioLibraryInline';
import { ReferenceTrackSelectorInline } from './ReferenceTrackSelectorInline';
import { cn } from '@/lib/utils';

interface AudioSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAudioSelect: (url: string, fileName: string) => void;
  onRecordComplete?: (audioBlob: Blob, audioUrl: string) => void;
  onTrackSelect?: (track: any) => void;
}

export const AudioSourceDialog = memo(({
  open,
  onOpenChange,
  onAudioSelect,
  onRecordComplete,
  onTrackSelect,
}: AudioSourceDialogProps) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'library' | 'tracks'>('upload');
  const { uploadAudio, isUploading } = useAudioUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isRecording,
    audioBlob,
    audioUrl: recordedAudioUrl,
    recordingTime,
    startRecording,
    stopRecording,
    reset: resetRecording,
  } = useAudioRecorder(undefined, uploadAudio);

  // Upload handlers
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadAudio(file);
    if (url) {
      onAudioSelect(url, file.name);
      onOpenChange(false);
      
      toast({
        title: '✅ Аудио загружено',
        description: `Файл "${file.name}" готов к использованию`,
        duration: 3000,
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadAudio, onAudioSelect, onOpenChange, toast]);

  // Recording handlers
  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка записи',
        description: error instanceof Error ? error.message : 'Не удалось начать запись',
      });
    }
  }, [startRecording, toast]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleUseRecording = useCallback(async () => {
    if (!audioBlob || !recordedAudioUrl) return;

    // Upload recorded audio
    const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
    const url = await uploadAudio(file);
    
    if (url) {
      onAudioSelect(url, file.name);
      
      if (onRecordComplete) {
        onRecordComplete(audioBlob, url);
      }
      
      onOpenChange(false);
      resetRecording();
      
      toast({
        title: '✅ Запись сохранена',
        description: 'Аудио готово к использованию',
        duration: 3000,
      });
    }
  }, [audioBlob, recordedAudioUrl, uploadAudio, onAudioSelect, onRecordComplete, onOpenChange, resetRecording, toast]);

  // Library handlers
  const handleLibrarySelect = useCallback((url: string, fileName: string) => {
    onAudioSelect(url, fileName);
    onOpenChange(false);
    
    toast({
      title: '✅ Аудио выбрано',
      description: `Файл "${fileName}" готов к использованию`,
      duration: 3000,
    });
  }, [onAudioSelect, onOpenChange, toast]);

  // Track selector handlers
  const handleTrackSelect = useCallback((track: any) => {
    if (track.audio_url) {
      onAudioSelect(track.audio_url, track.title || 'Untitled Track');
      
      if (onTrackSelect) {
        onTrackSelect(track);
      }
      
      onOpenChange(false);
      
      toast({
        title: '✅ Трек выбран',
        description: `"${track.title}" готов к использованию`,
        duration: 3000,
      });
    }
  }, [onAudioSelect, onTrackSelect, onOpenChange, toast]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Выбрать источник аудио</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="gap-1.5 text-xs sm:text-sm">
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Загрузить</span>
              <span className="sm:hidden">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="record" className="gap-1.5 text-xs sm:text-sm">
              <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Записать</span>
              <span className="sm:hidden">Record</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5 text-xs sm:text-sm">
              <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Библиотека</span>
              <span className="sm:hidden">Library</span>
            </TabsTrigger>
            <TabsTrigger value="tracks" className="gap-1.5 text-xs sm:text-sm">
              <Music className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Треки</span>
              <span className="sm:hidden">Tracks</span>
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-border/50 rounded-lg hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Загрузите аудио файл</p>
                <p className="text-xs text-muted-foreground">MP3, WAV, OGG до 20MB</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? 'Загрузка...' : 'Выбрать файл'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </TabsContent>

          {/* Record Tab */}
          <TabsContent value="record" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center transition-all",
                isRecording ? "bg-destructive/20 animate-pulse" : "bg-accent/20"
              )}>
                <Mic className={cn(
                  "h-12 w-12",
                  isRecording ? "text-destructive" : "text-muted-foreground"
                )} />
              </div>

              {isRecording && (
                <div className="text-2xl font-mono font-bold text-destructive">
                  {formatRecordingTime(recordingTime)}
                </div>
              )}

              <div className="flex gap-2">
                {!isRecording && !audioBlob && (
                  <Button onClick={handleStartRecording} className="gap-2">
                    <Mic className="h-4 w-4" />
                    Начать запись
                  </Button>
                )}

                {isRecording && (
                  <Button onClick={handleStopRecording} variant="destructive" className="gap-2">
                    Остановить
                  </Button>
                )}

                {audioBlob && !isRecording && (
                  <>
                    <Button onClick={resetRecording} variant="outline">
                      Записать заново
                    </Button>
                    <Button onClick={handleUseRecording} className="gap-2">
                      Использовать запись
                    </Button>
                  </>
                )}
              </div>

              {audioBlob && recordedAudioUrl && (
                <div className="w-full max-w-md">
                  <audio src={recordedAudioUrl} controls className="w-full" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="py-4">
            <ReferenceAudioLibraryInline
              onSelect={(url, fileName) => handleLibrarySelect(url, fileName)}
            />
          </TabsContent>

          {/* Tracks Tab */}
          <TabsContent value="tracks" className="py-4">
            <ReferenceTrackSelectorInline
              onSelect={(trackId, trackTitle) => {
                // Get full track data from query
                handleTrackSelect({ id: trackId, title: trackTitle, audio_url: '' });
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

AudioSourceDialog.displayName = 'AudioSourceDialog';
