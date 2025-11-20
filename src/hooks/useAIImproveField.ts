/**
 * Hook for AI-powered field improvements
 * @version 1.0.0
 * 
 * Uses Lovable AI to improve, generate, or rewrite text fields
 * with project/track context awareness.
 */

import { useState, useCallback } from 'react';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { EdgeFunctionResponse } from '@/types/edge-functions';

export type AIAction = 'improve' | 'generate' | 'rewrite';

interface UseAIImproveFieldOptions {
  onSuccess?: (result: string) => void;
  onError?: (error: string) => void;
}

interface ImproveFieldParams {
  field: string;
  value: string;
  action: AIAction;
  context?: string;
  additionalContext?: Record<string, any>;
}

export const useAIImproveField = ({ onSuccess, onError }: UseAIImproveFieldOptions = {}) => {
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const improveField = useCallback(async ({
    field,
    value,
    action,
    context,
    additionalContext,
  }: ImproveFieldParams) => {
    setIsImproving(true);
    setError(null);

    const span = Sentry.startInactiveSpan({
      name: 'ai-improve-field',
      op: 'ai.improve',
      attributes: {
        field,
        action,
        hasContext: !!context,
      },
    });

    try {
      logger.info(`AI ${action} started for field: ${field}`, 'useAIImproveField', { action, field });

      const { data, error: functionError } = await SupabaseFunctions.invoke<EdgeFunctionResponse<{ result: string }>>('ai-improve-field', {
        body: {
          field,
          value,
          action,
          context,
          additionalContext,
        },
      });

      if (functionError) {
        // Check for specific error codes that should not be retried
        const errorMessage = functionError.message || 'AI improvement failed';
        const isRateLimit = errorMessage.includes('Rate limit') || errorMessage.includes('429');
        const isPaymentRequired = errorMessage.includes('credits') || errorMessage.includes('402');
        
        if (isRateLimit) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        
        if (isPaymentRequired) {
          throw new Error('Insufficient credits. Please add funds to your workspace.');
        }
        
        throw new Error(errorMessage);
      }

      if (!data || !data.success) {
        const errorMessage = data?.error || 'AI improvement failed';
        
        // Don't retry on specific error codes
        if (data?.errorCode === 'RATE_LIMIT' || data?.errorCode === 'PAYMENT_REQUIRED') {
          throw new Error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      const result = typeof data.result === 'string' ? data.result : '';
      logger.info(`AI ${action} completed for field: ${field}`, 'useAIImproveField', { 
        action, 
        field,
        originalLength: value.length,
        resultLength: result.length,
      });

      span?.setStatus({ code: 1 }); // OK
      span?.end();

      onSuccess?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`AI ${action} failed for field: ${field}`, err as Error, 'useAIImproveField', { 
        action, 
        field 
      });

      Sentry.captureException(err, {
        tags: {
          component: 'useAIImproveField',
          action,
          field,
        },
      });

      span?.setStatus({ code: 2, message: errorMessage }); // ERROR
      span?.end();

      setError(errorMessage);
      onError?.(errorMessage);
      return null;

    } finally {
      setIsImproving(false);
    }
  }, [onSuccess, onError]);

  return {
    improveField,
    isImproving,
    error,
  };
};
