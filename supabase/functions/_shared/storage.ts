/**
 * Storage utility functions for downloading and uploading files to Supabase Storage
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Downloads a file from external URL with retry mechanism
 * @param url - External URL to download from
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Response with file data
 */
async function downloadWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      import('../_shared/logger.ts').then(({ logger }) => {
        logger.warn('Download attempt failed', { attempt: i + 1, status: response.status });
      });
    } catch (error) {
      import('../_shared/logger.ts').then(({ logger }) => {
        logger.error('Download attempt error', { error, attempt: i + 1 });
      });
      if (i === maxRetries - 1) throw error;
      // Exponential backoff: wait 1s, 2s, 3s
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to download file after ${maxRetries} attempts`);
}

/**
 * Upload to Supabase Storage with retry mechanism
 * @param supabase - Supabase client
 * @param bucket - Storage bucket name
 * @param path - File path
 * @param blob - File blob
 * @param contentType - MIME type
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Upload result
 */
async function uploadWithRetry(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          contentType,
          upsert: true,
          cacheControl: '31536000'
        });
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      import('../_shared/logger.ts').then(({ logger }) => {
        logger.error('Upload attempt failed', { error, attempt: i + 1, bucket, path });
      });
      if (i === maxRetries - 1) {
        return { data: null, error };
      }
      // Exponential backoff: 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
    }
  }
  throw new Error(`Upload failed after ${maxRetries} attempts`);
}

/**
 * Downloads audio from external URL and uploads to Supabase Storage
 * @param audioUrl - External URL from Suno (or other provider)
 * @param trackId - Track ID for folder organization
 * @param userId - User ID for folder organization
 * @param fileName - File name (e.g., 'main.mp3', 'version-2.mp3')
 * @param supabase - Supabase client instance
 * @returns Public URL in Supabase Storage
 */
export async function downloadAndUploadAudio(
  audioUrl: string,
  trackId: string,
  userId: string,
  fileName: string,
  supabase: SupabaseClient
): Promise<string> {
  import('../_shared/logger.ts').then(({ logger }) => {
    logger.info('Downloading audio from external URL', {
      trackId,
      fileName,
      urlPreview: audioUrl.substring(0, 60)
    });
  });
  
  try {
    // 1. Download from external URL with retry
    const response = await downloadWithRetry(audioUrl);
    const audioBlob = await response.blob();
    const audioSize = audioBlob.size;
    
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Audio downloaded', {
        trackId,
        sizeMB: (audioSize / 1024 / 1024).toFixed(2)
      });
    });
    
    // 2. Upload to Supabase Storage with retry
    const path = `${userId}/${trackId}/${fileName}`;
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Uploading to storage', {
        bucket: 'tracks-audio',
        path
      });
    });
    
    const contentType = audioBlob.type || 'audio/mpeg';
    
    const { data, error } = await uploadWithRetry(
      supabase,
      'tracks-audio',
      path,
      audioBlob,
      contentType
    );
    
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Audio content type detected', { 
        trackId,
        contentType,
        blobType: audioBlob.type
      });
    });
    
    if (error) {
      import('../_shared/logger.ts').then(({ logger }) => {
        logger.error('Upload failed after retries', { error, trackId, fileName });
      });
      throw error;
    }
    
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Upload successful', { trackId, fileName });
    });
    
    // 3. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tracks-audio')
      .getPublicUrl(path);
    
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Public URL generated', {
        trackId,
        urlPreview: publicUrl.substring(0, 60)
      });
    });
    
    return publicUrl;
  } catch (error) {
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.error('Failed to download and upload audio', {
        error,
        trackId,
        fileName
      });
      logger.warn('Falling back to original URL', { trackId });
    });
    return audioUrl;
  }
}

/**
 * Downloads cover image from external URL and uploads to Supabase Storage
 * @param coverUrl - External cover image URL
 * @param trackId - Track ID for folder organization
 * @param userId - User ID for folder organization
 * @param fileName - File name (e.g., 'cover.jpg')
 * @param supabase - Supabase client instance
 * @returns Public URL in Supabase Storage or original URL on failure
 */
export async function downloadAndUploadCover(
  coverUrl: string,
  trackId: string,
  userId: string,
  fileName: string,
  supabase: SupabaseClient
): Promise<string> {
  import('../_shared/logger.ts').then(({ logger }) => {
    logger.info('Downloading cover from external URL', { trackId, fileName });
  });
  
  try {
    const response = await downloadWithRetry(coverUrl);
    const coverBlob = await response.blob();
    
    const path = `${userId}/${trackId}/${fileName}`;
    
    const { data, error } = await uploadWithRetry(
      supabase,
      'tracks-covers',
      path,
      coverBlob,
      coverBlob.type || 'image/jpeg'
    );
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('tracks-covers')
      .getPublicUrl(path);
    
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Cover uploaded successfully', { trackId, fileName });
    });
    return publicUrl;
  } catch (error) {
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.error('Failed to upload cover', { error, trackId, fileName });
    });
    return coverUrl; // Fallback to original URL
  }
}

/**
 * Downloads video from external URL and uploads to Supabase Storage
 * @param videoUrl - External video URL
 * @param trackId - Track ID for folder organization
 * @param userId - User ID for folder organization
 * @param fileName - File name (e.g., 'video.mp4')
 * @param supabase - Supabase client instance
 * @returns Public URL in Supabase Storage or original URL on failure
 */
export async function downloadAndUploadVideo(
  videoUrl: string,
  trackId: string,
  userId: string,
  fileName: string,
  supabase: SupabaseClient
): Promise<string> {
  import('../_shared/logger.ts').then(({ logger }) => {
    logger.info('Downloading video from external URL', { trackId, fileName });
  });
  
  try {
    const response = await downloadWithRetry(videoUrl);
    const videoBlob = await response.blob();
    
    const path = `${userId}/${trackId}/${fileName}`;
    
    const { data, error } = await uploadWithRetry(
      supabase,
      'tracks-videos',
      path,
      videoBlob,
      videoBlob.type || 'video/mp4'
    );
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('tracks-videos')
      .getPublicUrl(path);
    
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.info('Video uploaded successfully', { trackId, fileName });
    });
    return publicUrl;
  } catch (error) {
    import('../_shared/logger.ts').then(({ logger }) => {
      logger.error('Failed to upload video', { error, trackId, fileName });
    });
    return videoUrl; // Fallback to original URL
  }
}

