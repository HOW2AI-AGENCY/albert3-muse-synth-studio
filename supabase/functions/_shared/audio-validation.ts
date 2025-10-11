/**
 * Audio file validation utilities for Supabase Edge Functions
 */

export interface AudioValidationResult {
  isValid: boolean;
  error?: string;
}

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
  'audio/aac',
  'audio/mp4',
  'audio/m4a',
] as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Validates audio file MIME type and size
 * @param contentType MIME type from request headers
 * @param fileSize File size in bytes
 * @returns Validation result
 */
export function validateAudioFile(
  contentType: string | null,
  fileSize: number
): AudioValidationResult {
  // Check MIME type
  if (!contentType) {
    return {
      isValid: false,
      error: 'No content type provided',
    };
  }

  const normalizedType = contentType.toLowerCase().split(';')[0].trim();

  if (!ALLOWED_MIME_TYPES.includes(normalizedType as any)) {
    return {
      isValid: false,
      error: `Invalid audio format: ${contentType}. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File too large: ${sizeMB}MB. Maximum allowed: ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Validates reference audio URL
 * @param url Audio URL to validate
 * @returns Validation result
 */
export async function validateAudioUrl(url: string): Promise<AudioValidationResult> {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return {
        isValid: false,
        error: `Failed to access audio file: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type');
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    return validateAudioFile(contentType, contentLength);
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to validate audio URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
