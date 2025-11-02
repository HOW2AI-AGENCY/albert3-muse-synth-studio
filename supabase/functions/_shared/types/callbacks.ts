/**
 * Shared types for Suno API callbacks
 * Used across all callback handlers for consistency
 */

export type CallbackType = 'text' | 'first' | 'complete' | 'error';

export type CallbackStatusCode = 200 | 400 | 451 | 500;

export interface SunoCallbackPayload {
  code: CallbackStatusCode;
  msg: string;
  data: {
    callbackType: CallbackType;
    task_id: string;
    data: SunoCallbackMusicData[] | null;
  };
}

export interface SunoCallbackMusicData {
  id: string;
  audio_url: string;
  source_audio_url?: string;
  stream_audio_url?: string;
  source_stream_audio_url?: string;
  image_url?: string;
  source_image_url?: string;
  video_url?: string;
  prompt?: string;
  model_name?: string;
  title?: string;
  tags?: string;
  createTime?: string;
  duration?: number;
}

/**
 * Helper to get detailed error message based on Suno API status code
 */
export function getDetailedErrorMessage(code: CallbackStatusCode, msg: string): string {
  switch (code) {
    case 400:
      return `Bad Request: ${msg} (Parameter error, unsupported format, or content violation)`;
    case 451:
      return `Download Failed: ${msg} (Unable to download source audio file)`;
    case 500:
      return `Server Error: ${msg} (Please try again later)`;
    default:
      return `Unknown Error (${code}): ${msg}`;
  }
}
