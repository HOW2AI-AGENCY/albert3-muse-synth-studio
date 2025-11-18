/**
 * Professional Image Upload Field Component
 * Features: Preview, Hover Overlay, Deletion, Validation, Skeleton, Error State
 * Russian localization included.
 */
import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, X, AlertTriangle } from '@/utils/iconImports';

interface ImageUploadFieldProps {
  initialImage?: string | null;
  onFileChange: (file: File | null) => void;
  className?: string;
  imageClassName?: string;
  maxSizeMb?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  initialImage,
  onFileChange,
  className,
  imageClassName,
  maxSizeMb = 5,
}) => {
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Файл слишком большой (макс. ${maxSizeMb} МБ)`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Неверный формат файла (нужно изображение)');
      return;
    }

    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setIsLoading(false);
      onFileChange(file);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileChange]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return <Skeleton className={cn("aspect-square w-full rounded-lg", className)} />;
  }

  if (error) {
    return (
      <div
        className={cn("aspect-square w-full rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/10 flex flex-col items-center justify-center text-center p-4", className)}
        onClick={triggerFileInput}
      >
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm font-semibold text-destructive">Ошибка</p>
        <p className="text-xs text-destructive/80">{error}</p>
        <Button variant="link" size="sm" className="mt-2 text-destructive">Попробовать снова</Button>
      </div>
    )
  }

  return (
    <div
      className={cn("aspect-square w-full rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors cursor-pointer group relative", className)}
      onClick={triggerFileInput}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      {preview ? (
        <>
          <img
            src={preview}
            alt="Предпросмотр"
            className={cn("w-full h-full object-cover rounded-md", imageClassName)}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={handleRemoveImage}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
          <Upload className="h-8 w-8 text-muted-foreground/70 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">Загрузить обложку</p>
          <p className="text-xs text-muted-foreground/80">Макс. {maxSizeMb} МБ</p>
        </div>
      )}
    </div>
  );
};
