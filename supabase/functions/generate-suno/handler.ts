/**
 * Suno Generation Handler
 * 
 * Implements Suno-specific generation logic:
 * - Suno API integration
 * - Balance checks
 * - Custom mode handling
 * - Reference audio support
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GenerationHandler } from "../_shared/generation-handler.ts";
import { createSunoClient, type SunoGenerationPayload } from "../_shared/suno.ts";
import { fetchSunoBalance } from "../_shared/suno-balance.ts";
import { logger } from "../_shared/logger.ts";
import type { SunoGenerationParams, ProviderTrackData } from "../_shared/types/generation.ts";

export class SunoGenerationHandler extends GenerationHandler<SunoGenerationParams> {
  protected providerName = 'suno' as const;
  private apiKey: string;
  private callbackUrl: string | null;

  constructor(supabase: SupabaseClient, userId: string, apiKey: string, callbackUrl: string | null) {
    super(supabase, userId);
    this.apiKey = apiKey;
    this.callbackUrl = callbackUrl;
  }

  protected async validateProviderParams(params: SunoGenerationParams): Promise<void> {
    // Check Suno balance
    logger.info('💳 Checking Suno balance...');
    const balanceResult = await fetchSunoBalance({ apiKey: this.apiKey });
    
    if (balanceResult.success) {
      logger.info('💳 Suno balance check complete', {
        balance: balanceResult.balance,
        endpoint: balanceResult.endpoint,
      });

      if (balanceResult.balance <= 0) {
        throw new Error('Недостаточно кредитов Suno для генерации трека. Пополните баланс и попробуйте снова.');
      }
    } else {
      logger.warn('⚠️ Failed to check Suno balance', {
        error: balanceResult.error,
        attempts: balanceResult.attempts,
      });
    }

    // Validate custom mode requirements
    const customMode = params.customMode ?? (params.lyrics ? true : false);
    if (customMode && !params.lyrics) {
      throw new Error("Custom mode requires lyrics. Please provide lyrics or switch to simple mode.");
    }
    
    if (!customMode && !params.prompt) {
      throw new Error("Simple mode requires a style description prompt.");
    }

    // Validate reference audio if provided
    if (params.referenceAudioUrl) {
      await this.validateReferenceAudio(params.referenceAudioUrl);
    } else if (params.referenceTrackId) {
      params.referenceAudioUrl = await this.fetchReferenceAudio(params.referenceTrackId);
    }
  }

  protected buildMetadata(params: SunoGenerationParams): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      provider: 'suno',
      make_instrumental: params.make_instrumental ?? false,
      model_version: params.modelVersion || 'chirp-v3-5',
      wait_audio: params.wait_audio ?? false,
    };

    if (params.styleTags) {
      metadata.tags = params.styleTags;
    }

    if (params.hasVocals !== undefined) {
      metadata.has_vocals = params.hasVocals;
    }

    if (params.customMode !== undefined) {
      metadata.custom_mode = params.customMode;
    }

    if (params.lyrics) {
      metadata.lyrics = params.lyrics;
    }

    if (params.negativeTags) {
      metadata.negative_tags = params.negativeTags;
    }

    if (params.vocalGender) {
      metadata.vocal_gender = params.vocalGender;
    }

    if (params.styleWeight !== undefined) {
      metadata.style_weight = params.styleWeight;
    }

    if (params.weirdnessConstraint !== undefined) {
      metadata.weirdness_constraint = params.weirdnessConstraint;
    }

    if (params.audioWeight !== undefined) {
      metadata.audio_weight = params.audioWeight;
    }

    if (params.referenceAudioUrl) {
      metadata.reference_audio_url = params.referenceAudioUrl;
    }

    if (params.referenceTrackId) {
      metadata.reference_track_id = params.referenceTrackId;
    }

    return metadata;
  }

  protected async callProviderAPI(params: SunoGenerationParams, trackId: string): Promise<string> {
    const sunoClient = createSunoClient({ apiKey: this.apiKey });
    const customMode = params.customMode ?? (params.lyrics ? true : false);

    // Build Suno API payload
    const sunoPayload: SunoGenerationPayload = {
      prompt: customMode ? (params.lyrics || '') : (params.prompt || ''),
      tags: params.styleTags || [],
      title: params.title || 'Generated Track',
      make_instrumental: params.make_instrumental ?? false,
      model: (params.modelVersion as SunoGenerationPayload['model']) || 'V5',
      customMode: customMode,
      callBackUrl: this.callbackUrl ?? undefined,
      ...(params.negativeTags ? { negativeTags: params.negativeTags } : {}),
      ...(params.vocalGender ? { vocalGender: params.vocalGender } : {}),
      ...(params.styleWeight !== undefined ? { styleWeight: Number(params.styleWeight.toFixed(2)) } : {}),
      ...(params.weirdnessConstraint !== undefined ? { weirdnessConstraint: Number(params.weirdnessConstraint.toFixed(2)) } : {}),
      ...(params.audioWeight !== undefined ? { audioWeight: Number(params.audioWeight.toFixed(2)) } : {}),
      ...(params.referenceAudioUrl ? { referenceAudioUrl: params.referenceAudioUrl } : {}),
    };

    logger.info('🎵 Calling Suno API', { 
      trackId, 
      customMode,
      promptType: customMode ? 'lyrics' : 'style_description',
    });

    const result = await sunoClient.generateTrack(sunoPayload);
    
    if (!result.taskId) {
      throw new Error('Suno API did not return task ID');
    }

    return result.taskId;
  }

  protected async pollTaskStatus(taskId: string): Promise<ProviderTrackData> {
    const sunoClient = createSunoClient({ apiKey: this.apiKey });
    const queryResult = await sunoClient.queryTask(taskId);

    // Parse Suno response - queryResult.tasks contains the tracks
    if (queryResult.status === 'SUCCESS' && queryResult.tasks.length > 0) {
      const track = queryResult.tasks[0];
      
      return {
        status: 'completed',
        audio_url: track.audioUrl,
        cover_url: track.imageUrl,
        duration: track.duration,
        title: track.title,
      };
    }

    if (queryResult.status === 'GENERATE_AUDIO_FAILED' || queryResult.status === 'CREATE_TASK_FAILED') {
      return {
        status: 'failed',
        error: 'Suno generation failed',
      };
    }

    // Still processing
    return {
      status: 'processing',
    };
  }

  // ============= Private Helper Methods =============

  private async validateReferenceAudio(url: string): Promise<void> {
    logger.info('🔍 Validating reference audio URL', { 
      url: url.substring(0, 50) 
    });
    
    try {
      const headResponse = await fetch(url, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw new Error(`Invalid reference audio: HTTP ${headResponse.status}`);
      }
      
      const contentType = headResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('audio/')) {
        throw new Error(`Invalid reference audio: expected audio/* content type, got ${contentType}`);
      }
      
      logger.info('✅ Reference audio validated', { contentType });
    } catch (error) {
      logger.error('🔴 Reference audio validation failed', { 
        error: error instanceof Error ? error.message : String(error),
        url: url.substring(0, 50)
      });
      throw new Error(`Reference audio validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchReferenceAudio(referenceTrackId: string): Promise<string> {
    logger.info('📂 Fetching reference audio from track', { referenceTrackId });
    
    const { data: refTrack, error: refError } = await this.supabase
      .from('tracks')
      .select('audio_url, title')
      .eq('id', referenceTrackId)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (refError || !refTrack?.audio_url) {
      logger.error('🔴 Reference track not found or has no audio', { 
        error: refError ?? undefined, 
        referenceTrackId 
      });
      throw new Error('Reference track not found or has no audio');
    }

    logger.info('✅ Reference audio fetched from track', { 
      audioUrl: refTrack.audio_url.substring(0, 50), 
      trackTitle: refTrack.title 
    });

    // Validate the fetched audio
    await this.validateReferenceAudio(refTrack.audio_url);

    return refTrack.audio_url;
  }
}
