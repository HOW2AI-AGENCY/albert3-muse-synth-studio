/**
 * Audio Upload Component
 * Sprint 30: Lyrics & Audio Management - Phase 2
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X } from 'lucide-react';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { validateAudioFile, FileValidationError } from '@/utils/file-validation';

interface AudioUploadProps {
  onUploadComplete?: () => void;
}

export const AudioUpload = React.memo<AudioUploadProps>(({ onUploadComplete }) => {
  const { saveAudio } = useAudioLibrary();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [folder, setFolder] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      try {
        // Sprint 31 - Task 1.2: Enhanced 3-layer validation
        await validateAudioFile(selectedFile);
        setFile(selectedFile);
      } catch (error) {
        if (error instanceof FileValidationError) {
          toast.error(error.message);
        } else {
          toast.error('Ошибка валидации файла');
        }
        logger.error('File validation failed', error as Error, 'AudioUpload');
        // Clear the input
        e.target.value = '';
      }
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.error('Выберите файл для загрузки');
      return;
    }

    setIsUploading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Необходима авторизация');
        return;
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reference-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reference-audio')
        .getPublicUrl(uploadData.path);

      // Get audio duration
      const audio = new Audio();
      const durationPromise = new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.src = URL.createObjectURL(file);
      });

      const duration = await durationPromise;

      // Save to library
      await saveAudio.mutateAsync({
        fileName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        durationSeconds: Math.floor(duration),
        sourceType: 'upload',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        folder: folder || undefined,
        description: description || undefined,
        sourceMetadata: {
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      });

      toast.success('Аудио успешно загружено');
      logger.info('Audio uploaded successfully', 'AudioUpload', { fileName: file.name });
      
      // Reset form
      setFile(null);
      setDescription('');
      setTags('');
      setFolder('');
      
      onUploadComplete?.();
    } catch (error) {
      logger.error('Failed to upload audio', error as Error, 'AudioUpload');
      toast.error('Не удалось загрузить аудио');
    } finally {
      setIsUploading(false);
    }
  }, [file, description, tags, folder, saveAudio, onUploadComplete]);

  return (
    <div className="space-y-4">
      {/* File input */}
      <div className="space-y-2">
        <Label>Аудио файл</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          {file && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {file && (
          <p className="text-sm text-muted-foreground">
            Выбран: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Описание (опционально)</Label>
        <Textarea
          placeholder="Добавьте описание к аудио..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isUploading}
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Теги (опционально)</Label>
        <Input
          placeholder="вокал, гитара, демо (через запятую)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={isUploading}
        />
      </div>

      {/* Folder */}
      <div className="space-y-2">
        <Label>Папка (опционально)</Label>
        <Input
          placeholder="Название папки"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          disabled={isUploading}
        />
      </div>

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>Загрузка...</>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Загрузить
          </>
        )}
      </Button>
    </div>
  );
});

AudioUpload.displayName = 'AudioUpload';
