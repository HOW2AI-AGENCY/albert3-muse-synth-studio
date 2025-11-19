import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { STORAGE_BUCKETS } from '@/config/storage.config';

interface UseImageUploadProps {
  onUploadSuccess?: (url: string) => void;
}

interface UseImageUploadResult {
  isUploading: boolean;
  uploadProgress: number;
  previewUrl: string | null;
  fileName: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleThumbnailClick: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemove: () => void;
  uploadImage: (file: File) => Promise<string | null>;
}

export const useImageUpload = ({ onUploadSuccess }: UseImageUploadProps = {}): UseImageUploadResult => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Only image files are allowed';
      toast({ variant: 'destructive', title: 'Invalid File Type', description: errorMsg });
      return null;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const errorMsg = 'File size must be less than 5MB';
      toast({ variant: 'destructive', title: 'File Too Large', description: errorMsg });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    const localPreviewUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setPreviewUrl(localPreviewUrl);
    previewUrlRef.current = localPreviewUrl;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const newFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      logger.info(`📤 [UPLOAD] Starting image upload: ${file.name} to bucket '${STORAGE_BUCKETS.IMAGES}'`);
      setUploadProgress(30);

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.IMAGES)
        .upload(newFileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;
      setUploadProgress(70);

      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.IMAGES)
        .getPublicUrl(newFileName);

      if (!data?.publicUrl) throw new Error('Failed to get public URL for the uploaded image.');

      setUploadProgress(100);
      logger.info(`✅ [UPLOAD] Image uploaded successfully: ${data.publicUrl}`);
      toast({ title: 'Image Uploaded', description: 'Your image has been successfully uploaded.' });

      onUploadSuccess?.(data.publicUrl);

      return data.publicUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`❌ [UPLOAD] Image upload failed: ${errorMessage}`);
      toast({ variant: 'destructive', title: 'Upload Failed', description: errorMessage });
      handleRemove();
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadImage(file);
      }
    },
    [onUploadSuccess],
  );

  const handleRemove = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewUrlRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return {
    isUploading,
    uploadProgress,
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  };
};
