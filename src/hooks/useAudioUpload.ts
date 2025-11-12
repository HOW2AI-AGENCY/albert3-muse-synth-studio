import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useAudioUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadAudio = async (file: File): Promise<string> => {
    if (!file.type.startsWith('audio/')) {
      const error = new Error('Only audio files are allowed');
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: error.message,
      });
      throw error;
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB limit
    if (file.size > MAX_SIZE) {
      const error = new Error('File size must be less than 20MB');
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: error.message,
      });
      throw error;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      logger.info(`📤 [UPLOAD] Starting audio upload: ${file.name} (${file.size} bytes)`);
      setUploadProgress(30);

      const { error } = await supabase.storage
        .from('reference-audio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        logger.error(`❌ [UPLOAD] Upload failed: ${error.message}`);
        throw error;
      }

      setUploadProgress(70);

      const { data: { publicUrl } } = supabase.storage
        .from('reference-audio')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for the uploaded file.');
      }

      setUploadProgress(100);

      logger.info(`✅ [UPLOAD] Audio uploaded successfully: ${publicUrl}`);

      try {
        const { error: dbError } = await supabase
          .from('audio_library')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            source_type: 'upload',
            usage_count: 0,
          });

        if (dbError) {
          logger.error(`⚠️ [UPLOAD] Failed to save to audio_library: ${dbError.message}`);
        } else {
          logger.info(`✅ [UPLOAD] Saved to audio_library`);
        }
      } catch (dbError) {
        logger.error(`⚠️ [UPLOAD] Database error: ${dbError instanceof Error ? dbError.message : 'Unknown'}`);
      }

      toast({
        title: 'Аудио загружено',
        description: 'Файл успешно загружен и сохранён в библиотеку',
      });

      return publicUrl;
    } catch (error) {
      logger.error(`❌ [UPLOAD] Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Не удалось загрузить файл',
      });
      throw error;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return { uploadAudio, isUploading, uploadProgress };
};
