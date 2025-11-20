import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";
import { retryWithBackoff, RETRY_CONFIGS } from "@/utils/retryWithBackoff";

export interface GenerateLyricsRequest {
    prompt: string;
    trackId?: string;
    llmModel?: 'claude-haiku' | 'claude-sonnet' | 'gpt-4o';
  }

  export interface GenerateLyricsResponse {
    success: boolean;
    jobId: string;
    message?: string;
    error?: string;
  }

export class LyricsService {
  /**
   * Generate lyrics using AI
   */
  static async generateLyrics(
    request: GenerateLyricsRequest
  ): Promise<GenerateLyricsResponse> {
    const context = "LyricsService.generateLyrics";

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
