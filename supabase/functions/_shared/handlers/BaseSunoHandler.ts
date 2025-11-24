/**
 * Base Suno Handler - Phase 2 Implementation
 * Provides unified logic for music generation Edge Functions
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../logger.ts";
import { SunoApiError } from "../suno.ts";

export interface BaseTrackParams {
  userId: string;
  title: string;
  prompt: string;
  tags?: string[];
  lyrics?: string;
  make_instrumental?: boolean;
  model_version?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackCreationResult {
  trackId: string;
  track: any;
}

/**
 * Base handler for all Suno-based music generation operations
 * Consolidates common logic: track creation, status updates, API calls
 */
export abstract class BaseSunoHandler {
  protected supabase: SupabaseClient;
  protected userId: string;
  protected apiKey: string;

  constructor(
    supabase: SupabaseClient,
    userId: string,
    apiKey: string
  ) {
    this.supabase = supabase;
    this.userId = userId;
    this.apiKey = apiKey;
  }

  /**
   * ✅ Unified track record creation
   */
  protected async createTrackRecord(params: BaseTrackParams): Promise<TrackCreationResult> {
    logger.info('Creating track record', {
      userId: params.userId,
      title: params.title,
      provider: 'suno'
    });

    const { data: track, error } = await this.supabase
      .from('tracks')
      .insert({
        user_id: params.userId,
        title: params.title,
        prompt: params.prompt,
        lyrics: params.lyrics,
        provider: 'suno',
        status: 'pending',
        style_tags: params.tags,
        make_instrumental: params.make_instrumental,
        model_name: params.model_version,
        metadata: params.metadata || {},
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to create track record', error);
      throw new Error(`Failed to create track: ${error.message}`);
    }

    if (!track) {
      throw new Error('Track creation returned no data');
    }

    logger.info('Track record created successfully', { trackId: track.id });

    return {
      trackId: track.id,
      track,
    };
  }

  /**
   * ✅ Unified track status update
   */
  protected async updateTrackStatus(
    trackId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    logger.info('Updating track status', { trackId, status });

    const updateData: Record<string, unknown> = { status };

    if (metadata) {
      // Fetch current metadata first
      const { data: currentTrack } = await this.supabase
        .from('tracks')
        .select('metadata')
        .eq('id', trackId)
        .single();

      updateData.metadata = {
        ...(currentTrack?.metadata || {}),
        ...metadata,
      };
    }

    const { error } = await this.supabase
      .from('tracks')
      .update(updateData)
      .eq('id', trackId);

    if (error) {
      logger.error('Failed to update track status', { error, trackId, status });
      throw new Error(`Failed to update track: ${error.message}`);
    }

    logger.info('Track status updated successfully', { trackId, status });
  }

  /**
   * ✅ Unified Suno API call with retry logic
   */
  protected async callSunoAPI(
    endpoint: string,
    payload: Record<string, unknown>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
    }
  ): Promise<any> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;

    logger.info('Calling Suno API', { endpoint, payload });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        // Handle rate limiting
        if (response.status === 429) {
          if (attempt < maxRetries - 1) {
            const backoffDelay = retryDelay * Math.pow(2, attempt);
            logger.warn('Rate limit hit, retrying', {
              attempt: attempt + 1,
              maxRetries,
              backoffDelay,
            });
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
        }

        if (!response.ok) {
          throw new SunoApiError(`Suno API error: ${response.status}`, {
            endpoint,
            status: response.status,
            body: JSON.stringify(data),
          });
        }

        // Check for API-level error codes (code !== 200)
        if (data.code && data.code !== 200) {
          throw new SunoApiError(data.msg || 'Suno API error', {
            endpoint,
            status: response.status,
            body: JSON.stringify(data),
          });
        }

        logger.info('Suno API call successful', {
          endpoint,
          taskId: data?.data?.taskId || data?.taskId,
        });

        return data;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          logger.error('Suno API call failed after retries', {
            error: error as Error,
            endpoint,
            attempts: maxRetries,
          });
          throw error;
        }

        logger.warn('Suno API call failed, retrying', {
          attempt: attempt + 1,
          maxRetries,
          error: (error as Error).message,
        });

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Unexpected error in callSunoAPI');
  }

  /**
   * ✅ Extract task ID from Suno response
   */
  protected extractTaskId(response: any): string {
    const taskId = response?.data?.taskId || response?.taskId;

    if (!taskId) {
      logger.error('No taskId in Suno response', { response });
      throw new Error('Suno response did not include taskId');
    }

    return taskId;
  }

  /**
   * ✅ Abstract method to be implemented by subclasses
   */
  abstract execute(params: unknown): Promise<unknown>;
}
