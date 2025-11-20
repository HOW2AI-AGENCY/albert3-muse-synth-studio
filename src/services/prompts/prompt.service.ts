import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";
import { retryWithBackoff, RETRY_CONFIGS } from "@/utils/retryWithBackoff";
import { startKpiTimer, endKpiTimer } from "@/utils/kpi";
import { recordPerformanceMetric } from "@/utils/performanceMonitor";

export interface ImprovePromptRequest {
    prompt: string;
    llmModel?: 'claude-haiku' | 'claude-sonnet' | 'gpt-4o';
  }

  export interface ImprovePromptResponse {
    improvedPrompt: string;
    originalPrompt: string;
    modelUsed: string;
    latency: number;
    success: boolean;
    error?: string;
  }

  // Helper for tracking API requests
const trackAPIRequest = (
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    error?: any
  ) => {
    recordPerformanceMetric('api_call', duration, 'PromptService', {
      endpoint,
      method,
      statusCode,
      error: error ? (error.message || String(error)) : undefined
    });
  };

export class PromptService {
  /**
   * Improve a music prompt using AI
   */
  static async improvePrompt(
    request: ImprovePromptRequest
  ): Promise<ImprovePromptResponse> {
    const context = "PromptService.improvePrompt";
    const timerId = `${context}:${Date.now()}`;
    startKpiTimer(timerId);

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
