/**
 * Lyrics Service
 *
 * Handles all lyrics-related operations including generation.
 *
 * @module services/lyrics/lyrics.service
 * @since v2.6.3
 */

import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";
import { retryWithBackoff, RETRY_CONFIGS } from "@/utils/retryWithBackoff";

export interface GenerateLyricsRequest {
  prompt: string;
  trackId?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateLyricsResponse {
  success: boolean;
  jobId: string;
  taskId: string;
  status: string;
}

/**
 * Lyrics Service - handles all lyrics-related operations
 */
export class LyricsService {
  /**
   * Generate lyrics using AI
   *
   * @param request - Lyrics generation request
   * @returns Promise with generation response
   *
   * @example
   * ```typescript
   * const result = await LyricsService.generate({
   *   prompt: 'A love song about summer nights',
   *   trackId: 'track-123'
   * });
   *
   * console.log('Job ID:', result.jobId);
   * console.log('Task ID:', result.taskId);
   * ```
   */
  static async generate(
    request: GenerateLyricsRequest
  ): Promise<GenerateLyricsResponse> {
    const context = "LyricsService.generate";

    // Use retry logic for lyrics generation
    const { data, error } = await retryWithBackoff(
      () => SupabaseFunctions.invoke<GenerateLyricsResponse>(
        "generate-lyrics",
        { body: request }
      ),
      {
        ...RETRY_CONFIGS.critical,
        onRetry: (error, attempt) => {
          logWarn(
            `Generate lyrics request failed, retrying...`,
            context,
            {
              attempt,
              error: error.message,
            }
          );
        },
      }
    );

    if (error || !data) {
      return handleSupabaseFunctionError(
        error,
        "Failed to start lyrics generation",
        context,
        {
          promptLength: request.prompt.length,
          hasTrack: Boolean(request.trackId),
        }
      );
    }

    return data;
  }
}
