/**
 * Prompt Service
 *
 * Handles all prompt-related operations including AI improvement.
 *
 * @module services/prompts/prompt.service
 * @since v2.6.3
 */

import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";
import { retryWithBackoff, RETRY_CONFIGS } from "@/utils/retryWithBackoff";
import { startKpiTimer, endKpiTimer } from "@/utils/kpi";
import { trackAPIRequest } from "@/utils/sentry-enhanced";

export interface ImprovePromptRequest {
  prompt: string;
}

export interface ImprovePromptResponse {
  improvedPrompt: string;
}

/**
 * Prompt Service - handles all prompt-related operations
 */
export class PromptService {
  /**
   * Improve a music prompt using AI
   *
   * @param request - Prompt improvement request
   * @returns Promise with improved prompt
   *
   * @example
   * ```typescript
   * const result = await PromptService.improve({
   *   prompt: 'upbeat music'
   * });
   *
   * console.log('Original:', 'upbeat music');
   * console.log('Improved:', result.improvedPrompt);
   * // Output: "An energetic and uplifting electronic dance track with..."
   * ```
   */
  static async improve(
    request: ImprovePromptRequest
  ): Promise<ImprovePromptResponse> {
    const context = "PromptService.improve";
    const timerId = `${context}:${Date.now()}`;
    startKpiTimer(timerId);

    // Use retry logic for prompt improvement
    const { data, error } = await retryWithBackoff(
      () => SupabaseFunctions.invoke<ImprovePromptResponse>(
        "improve-prompt",
        { body: request }
      ),
      {
        ...RETRY_CONFIGS.standard,
        onRetry: (error, attempt) => {
          logWarn(
            `Improve prompt request failed, retrying...`,
            context,
            {
              attempt,
              error: error.message,
            }
          );
        },
      }
    );

    // KPI + Sentry
    const duration = endKpiTimer(timerId, 'api_latency', { endpoint: 'improve-prompt' }) ?? 0;
    trackAPIRequest('improve-prompt', 'POST', error ? 500 : 200, duration, error ?? undefined as any);

    if (error || !data) {
      return handleSupabaseFunctionError(
        error,
        "Failed to improve prompt",
        context,
        { promptLength: request.prompt.length }
      );
    }

    return data;
  }
}
