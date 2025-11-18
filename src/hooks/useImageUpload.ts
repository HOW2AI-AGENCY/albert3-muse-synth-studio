import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface UseImageUploadResult {
  uploadImage: (file: File) => Promise<string | null>;
  isUploading: boolean;
  uploadProgress: number;
  previewUrl: string | null;
  fileName: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleThumbnailClick: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemove: () => void;
}

export const useImageUpload = (): UseImageUploadResult => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // To prevent memory leaks with object URLs
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    // 1. Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Only image files are allowed';
      toast({ variant: 'destructive', title: 'Invalid File Type', description: errorMsg });
      logger.warn(`[UPLOAD] Invalid file type: ${file.type}`);
      return null;
    }

    // 2. Validate file size (e.g., 5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const errorMsg = 'File size must be less than 5MB';
      toast({ variant: 'destructive', title: 'File Too Large', description: errorMsg });
      logger.warn(`[UPLOAD] File too large: ${file.size} bytes`);
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    // Create a local preview immediately
    const localPreviewUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setPreviewUrl(localPreviewUrl);
    previewUrlRef.current = localPreviewUrl;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const newFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      logger.info(`📤 [UPLOAD] Starting image upload: ${file.name} to bucket 'images'`);
      setUploadProgress(30);

      const { error } = await supabase.storage
        .from('images') // Target 'images' bucket
        .upload(newFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setUploadProgress(70);

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(newFileName);

      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL for the uploaded image.');
      }

      setUploadProgress(100);
      logger.info(`✅ [UPLOAD] Image uploaded successfully: ${data.publicUrl}`);
      toast({ title: 'Image Uploaded', description: 'Your image has been successfully uploaded.' });

      return data.publicUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`❌ [UPLOAD] Image upload failed: ${errorMessage}`);
      toast({ variant: 'destructive', title: 'Upload Failed', description: errorMessage });
      // Reset UI on failure
      handleRemove();
      return null;
    } finally {
      setIsUploading(false);
      // Let the progress bar finish before hiding
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
    [], // uploadImage is stable due to useState setters
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
    uploadImage,
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
