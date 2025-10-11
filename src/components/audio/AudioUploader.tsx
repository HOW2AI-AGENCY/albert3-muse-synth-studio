import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { cn } from '@/lib/utils';

interface AudioUploaderProps {
  onUploadComplete?: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

export const AudioUploader = ({ onUploadComplete, onRemove, className }: AudioUploaderProps) => {
  const { uploadAudio, isUploading, uploadProgress } = useAudioUpload();
  const [isDragActive, setIsDragActive] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    setFileName(file.name);
    const uploadedUrl = await uploadAudio(file);
    
    if (uploadedUrl) {
      setAudioUrl(uploadedUrl);
      onUploadComplete?.(uploadedUrl);
    }
  };

  const handleClick = () => {
    if (!isUploading && !audioUrl) {
      inputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAudioUrl(null);
    setFileName('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-all cursor-pointer',
        isDragActive && 'border-primary bg-primary/5',
        isUploading && 'pointer-events-none',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
      />

      <CardContent
        className="flex flex-col items-center justify-center py-8"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <Progress value={uploadProgress} className="w-full max-w-xs mb-2" />
            <p className="text-sm text-muted-foreground">
              Загрузка... {uploadProgress}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
          </>
        ) : audioUrl ? (
          <>
            <CheckCircle className="w-8 h-8 text-success mb-2" />
            <p className="text-sm font-medium">Файл загружен</p>
            <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
            <audio controls src={audioUrl} className="mt-4 w-full max-w-xs" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="mt-2"
            >
              <X className="w-4 h-4 mr-1" /> Удалить
            </Button>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Нажмите или перетащите аудио</p>
            <p className="text-xs text-muted-foreground mt-1">
              MP3, WAV, OGG, FLAC (макс. 20MB)
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
