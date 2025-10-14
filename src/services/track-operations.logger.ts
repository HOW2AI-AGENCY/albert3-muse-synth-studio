/**
 * ✅ Phase 3: Track Operations Logger
 * Централізоване логування всіх операцій з треками
 */

import { logger } from '@/utils/logger';
import { AnalyticsService } from './analytics.service';

export type TrackOperation = 
  | 'create'
  | 'update'
  | 'delete'
  | 'share'
  | 'download'
  | 'retry'
  | 'extend'
  | 'cover'
  | 'add_vocal'
  | 'toggle_public'
  | 'like'
  | 'unlike';

export interface TrackOperationContext {
  trackId: string;
  operation: TrackOperation;
  userId?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  duration?: number;
  errorMessage?: string;
}

export class TrackOperationsLogger {
  /**
   * Log track operation with analytics
   */
  static async logOperation(context: TrackOperationContext): Promise<void> {
    const { trackId, operation, userId, metadata, success, duration, errorMessage } = context;

    // Console logging
    const logContext = {
      trackId,
      userId,
      duration,
      ...metadata,
    };

    if (success) {
      logger.info(`Track operation: ${operation}`, 'TrackOperationsLogger', logContext);
    } else {
      logger.error(
        `Track operation failed: ${operation}`,
        new Error(errorMessage || 'Unknown error'),
        'TrackOperationsLogger',
        logContext
      );
    }

    // Analytics tracking
    try {
      await AnalyticsService.recordEvent({
        eventType: `track_${operation}`,
        trackId,
        userId,
        metadata: {
          success,
          duration,
          errorMessage,
          ...metadata,
        },
      });
    } catch (error) {
      logger.warn('Failed to record track operation analytics', 'TrackOperationsLogger', {
        operation,
        trackId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a performance-tracked wrapper for track operations
   */
  static trackOperation<T>(
    operation: TrackOperation,
    trackId: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();

    return fn()
      .then((result) => {
        const duration = Date.now() - startTime;
        
        void this.logOperation({
          trackId,
          operation,
          success: true,
          duration,
          metadata,
        });

        return result;
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        
        void this.logOperation({
          trackId,
          operation,
          success: false,
          duration,
          errorMessage: error instanceof Error ? error.message : String(error),
          metadata,
        });

        throw error;
      });
  }

  /**
   * Batch log multiple operations
   */
  static async logBatchOperations(contexts: TrackOperationContext[]): Promise<void> {
    await Promise.all(contexts.map((context) => this.logOperation(context)));
  }
}
