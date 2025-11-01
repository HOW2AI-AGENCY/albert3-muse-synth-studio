import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useAudioUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadAudio = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('audio/')) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Пожалуйста, выберите аудио файл'
      });
      return null;
    }

    // Лимит 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({
        variant: 'destructive',
        title: 'Файл слишком большой',
        description: 'Максимальный размер файла 20MB'
      });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      logger.info(`📤 [UPLOAD] Starting audio upload: ${file.name} (${file.size} bytes)`);

      setUploadProgress(30);

      // Загружаем в bucket reference-audio
      const { error } = await supabase.storage
        .from('reference-audio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logger.error(`❌ [UPLOAD] Upload failed: ${error.message}`);
        throw error;
      }

      setUploadProgress(70);

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('reference-audio')
        .getPublicUrl(fileName);

      setUploadProgress(100);

      logger.info(`✅ [UPLOAD] Audio uploaded successfully: ${publicUrl}`);

      toast({
        title: 'Аудио загружено',
        description: 'Файл успешно загружен и готов к использованию'
      });

      return publicUrl;
    } catch (error) {
      logger.error(`❌ [UPLOAD] Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Не удалось загрузить файл'
      });
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return { uploadAudio, isUploading, uploadProgress };
};
