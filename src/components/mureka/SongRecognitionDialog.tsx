import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecognizeSong } from '@/hooks/useRecognizeSong';
import { Loader2, Music, Upload } from 'lucide-react';
import { useAudioUpload } from '@/hooks/useAudioUpload';

interface SongRecognitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId?: string;
}

export const SongRecognitionDialog = ({ open, onOpenChange, trackId }: SongRecognitionDialogProps) => {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { mutateAsync: recognize, isPending } = useRecognizeSong();
  const { uploadAudio, isUploading } = useAudioUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
  };

  const handleRecognize = async () => {
    if (!pendingFile) return;

    const audioUrl = await uploadAudio(pendingFile);
    if (!audioUrl) return;

    await recognize({ audioFileUrl: audioUrl, trackId });
    setPendingFile(null);
    onOpenChange(false);
  };

  const isLoading = isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Распознать песню
          </DialogTitle>
          <DialogDescription>
            Загрузите аудио файл для распознавания названия и исполнителя
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="audio-file">Аудио файл</Label>
            <div className="flex items-center gap-2">
              <Input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                disabled={isLoading}
              />
              {pendingFile && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Upload className="h-3 w-3" />
                  {pendingFile.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleRecognize}
            disabled={!pendingFile || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Распознать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
