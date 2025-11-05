/**
 * Audio Uploader Component
 * Sprint 33.2: Upload & Extend Audio
 */

import { memo, useCallback, useState } from 'react';
import { Upload, X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  accept?: string;
  maxSizeMB?: number;
}

export const AudioUploader = memo(({
  onFileSelect,
  selectedFile,
  onClear,
  accept = 'audio/mp3,audio/wav,audio/flac,audio/m4a',
  maxSizeMB = 10
}: AudioUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
      return false;
    }

    const validTypes = accept.split(',').map(t => t.trim());
    if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
      toast.error('Неподдерживаемый формат файла');
      return false;
    }

    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(f => f.type.startsWith('audio/'));

    if (audioFile && validateFile(audioFile)) {
      onFileSelect(audioFile);
    }
  }, [onFileSelect, accept, maxSizeMB]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
    e.target.value = '';
  }, [onFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full space-y-2">
      {!selectedFile ? (
        <Card
          className={cn(
            'border-2 border-dashed transition-all duration-200',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/5'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center p-8 cursor-pointer">
            <Upload className={cn(
              'w-12 h-12 mb-4 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )} />
            <p className="text-sm font-medium mb-1">
              Перетащите аудио файл или нажмите для выбора
            </p>
            <p className="text-xs text-muted-foreground">
              MP3, WAV, FLAC, M4A (макс. {maxSizeMB}MB)
            </p>
            <input
              type="file"
              accept={accept}
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </Card>
      ) : (
        <Card className="p-4 bg-accent/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-11 w-11 sm:h-8 sm:w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
});

AudioUploader.displayName = 'AudioUploader';
