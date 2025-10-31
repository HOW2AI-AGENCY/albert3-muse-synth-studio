/**
 * @fileoverview Mureka Response Normalizers
 * @description Normalize various Mureka API response formats to unified structure
 * @version 1.0.0
 */

import { logger } from "./logger.ts";
import {
  MurekaLyricsResponseSchema,
  MurekaMusicResponseSchema,
  type MurekaLyricsVariant,
  type MurekaTrackClip,
} from "./mureka-schemas.ts";

// ============================================================================
// NORMALIZED RESPONSE TYPES
// ============================================================================

export interface NormalizedLyricsResponse {
  success: boolean;
  taskId?: string;
  variants: MurekaLyricsVariant[];
  requiresSelection: boolean;
  error?: string;
}

export interface NormalizedMusicResponse {
  success: boolean;
  taskId: string;
  clips: MurekaTrackClip[];
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

// ============================================================================
// LYRICS RESPONSE NORMALIZER
// ============================================================================

/**
 * Normalize Mureka Lyrics API response to unified format
 * Handles both wrapped (code+msg+data) and direct responses
 */
export function normalizeMurekaLyricsResponse(
  rawResponse: unknown
): NormalizedLyricsResponse {
  logger.debug("[MUREKA] Starting lyrics response normalization");

  try {
    // Validate response structure
    const validated = MurekaLyricsResponseSchema.parse(rawResponse);
    logger.debug("[MUREKA] Schema validation successful", { hasCode: "code" in validated });

    // Handle wrapped response (code + msg + data)
    if ("code" in validated) {
      const wrappedResponse = validated;
      logger.debug("[MUREKA] Processing wrapped response", { code: wrappedResponse.code });

      if (wrappedResponse.code !== 200) {
        logger.error(`[MUREKA] Lyrics API error: ${wrappedResponse.msg}`, {
          code: wrappedResponse.code,
          msg: wrappedResponse.msg,
        });

        return {
          success: false,
          variants: [],
          requiresSelection: false,
          error: wrappedResponse.msg || "Unknown API error",
        };
      }

      const variants = wrappedResponse.data?.data || [];
      logger.debug("[MUREKA] Extracted variants from wrapped response", {
        count: variants.length,
      });

      return {
        success: true,
        taskId: wrappedResponse.data?.task_id,
        variants,
        requiresSelection: variants.length > 1,
      };
    }

    // Handle direct response
    const directResponse = validated;
    logger.debug("[MUREKA] Processing direct response");

    const variants = directResponse.data || [];
    
    // Fallback to single lyrics string if no variants array
    if (variants.length === 0 && directResponse.lyrics) {
      logger.debug("[MUREKA] Converting single lyrics string to variant");
      variants.push({
        text: directResponse.lyrics,
        status: "complete",
      });
    }

    logger.debug("[MUREKA] Extracted variants from direct response", {
      count: variants.length,
    });

    return {
      success: variants.length > 0,
      taskId: directResponse.task_id,
      variants,
      requiresSelection: variants.length > 1,
      error: variants.length === 0 ? "No lyrics returned from API" : undefined,
    };
  } catch (error) {
    logger.error("[MUREKA] Lyrics response normalization failed", {
      error: error instanceof Error ? error.message : String(error),
      rawResponseType: typeof rawResponse,
    });

    return {
      success: false,
      variants: [],
      requiresSelection: false,
      error:
        error instanceof Error
          ? `Failed to parse response: ${error.message}`
          : "Unknown parsing error",
    };
  }
}

// ============================================================================
// MUSIC RESPONSE NORMALIZER
// ============================================================================

/**
 * Normalize Mureka Music Generation API response to unified format
 */
export function normalizeMurekaMusicResponse(
  rawResponse: unknown
): NormalizedMusicResponse {
  logger.info("🔍 [MUREKA-NORMALIZER] Starting music response normalization", {
    responseType: typeof rawResponse,
    hasData: !!(rawResponse as any)?.data,
    rawResponsePreview: JSON.stringify(rawResponse).substring(0, 500),
  });

  try {
    const validated = MurekaMusicResponseSchema.parse(rawResponse);
    logger.info("✅ [MUREKA-NORMALIZER] Schema validation successful");

    // Handle wrapped response
    if ("code" in validated) {
      const wrappedResponse = validated;
      logger.debug("[MUREKA] Processing wrapped music response", {
        code: wrappedResponse.code,
      });

      if (wrappedResponse.code !== 200) {
        logger.error(`[MUREKA] Music API error: ${wrappedResponse.msg}`, {
          code: wrappedResponse.code,
        });

        return {
          success: false,
          taskId: wrappedResponse.data?.task_id || wrappedResponse.data?.id || "unknown",
          clips: [],
          status: "failed",
          error: wrappedResponse.msg,
        };
      }

      // ✅ NEW: Support API v7 'choices' format (priority)
      const rawClips = wrappedResponse.data?.choices || 
                    wrappedResponse.data?.clips || 
                    wrappedResponse.data?.data || [];
      
      // ✅ TRANSFORM: Normalize audio URL with fallback chain (url → audio_url → flac_url)
      const clips = rawClips.map((clip, index) => {
        const audioUrl = clip.url || clip.audio_url || clip.flac_url || '';
        
        logger.info(`🎧 [MUREKA-NORMALIZER] Clip ${index} audio URL detection`, {
          clipId: clip.id,
          hasUrl: !!clip.url,
          hasAudioUrl: !!clip.audio_url,
          hasFlacUrl: !!clip.flac_url,
          selectedUrl: audioUrl ? audioUrl.substring(0, 80) : 'NONE',
          allClipFields: Object.keys(clip),
        });
        
        return {
          ...clip,
          audio_url: audioUrl,
        };
      });
      
      logger.info("🎵 [MUREKA-NORMALIZER] Extracted clips from wrapped response", {
        count: clips.length,
        source: wrappedResponse.data?.choices ? 'choices (v7)' : 
                wrappedResponse.data?.clips ? 'clips (legacy)' : 'data (legacy)',
        hasValidAudio: clips.length > 0 && !!clips[0].audio_url,
        firstClipKeys: clips.length > 0 ? Object.keys(clips[0]) : [],
      });

      // Normalize status: map v7 statuses to our internal format
      const rawStatus = wrappedResponse.data?.status || "pending";
      const normalizedStatus: "pending" | "processing" | "completed" | "failed" = 
        rawStatus === "preparing" || rawStatus === "queued" ? "pending" :
        rawStatus === "running" || rawStatus === "streaming" ? "processing" :
        rawStatus === "succeeded" ? "completed" :
        rawStatus === "timeouted" || rawStatus === "cancelled" ? "failed" :
        rawStatus;

      // Mureka uses 'id' instead of 'task_id' in initial response
      const taskId = wrappedResponse.data?.task_id || wrappedResponse.data?.id || "unknown";

      // ✅ VALIDATION: If status is 'completed' but no clips have valid audio_url, mark as failed
      if (normalizedStatus === 'completed' && clips.length > 0) {
        const validClips = clips.filter(clip => clip.audio_url && clip.audio_url.trim() !== '');
        
        if (validClips.length === 0) {
          logger.error('🔴 [MUREKA-NORMALIZER] Status "completed" but NO valid audio_url in any clip', {
            taskId,
            clipsCount: clips.length,
            clipIds: clips.map(c => c.id),
          });
          
          return {
            success: false,
            taskId,
            clips: [],
            status: 'failed',
            error: 'No valid audio_url in completed response',
          };
        }
        
        logger.info('✅ [MUREKA-NORMALIZER] Completed with valid audio URLs', {
          taskId,
          validClipsCount: validClips.length,
        });
      }

      return {
        success: true,
        taskId,
        clips,
        status: normalizedStatus,
      };
    }

    // Handle direct response
    const directResponse = validated;
    // ✅ NEW: Support API v7 'choices' format (priority)
    const rawClips = directResponse.choices || 
                  directResponse.clips || 
                  directResponse.data || [];
    
    // ✅ TRANSFORM: Normalize audio URL with fallback chain (url → audio_url → flac_url)
    const clips = rawClips.map((clip, index) => {
      const audioUrl = clip.url || clip.audio_url || clip.flac_url || '';
      
      logger.info(`🎧 [MUREKA-NORMALIZER] Direct clip ${index} audio URL detection`, {
        clipId: clip.id,
        hasUrl: !!clip.url,
        hasAudioUrl: !!clip.audio_url,
        hasFlacUrl: !!clip.flac_url,
        selectedUrl: audioUrl ? audioUrl.substring(0, 80) : 'NONE',
      });
      
      return {
        ...clip,
        audio_url: audioUrl,
      };
    });
    
    logger.info("🎵 [MUREKA-NORMALIZER] Extracted clips from direct response", {
      count: clips.length,
      source: directResponse.choices ? 'choices (v7)' : 
              directResponse.clips ? 'clips (legacy)' : 'data (legacy)',
      hasAudioUrl: clips.length > 0 && !!clips[0].audio_url,
    });

    // Normalize status: map v7 statuses to our internal format
    const rawStatus = directResponse.status || "pending";
    const normalizedStatus: "pending" | "processing" | "completed" | "failed" = 
      rawStatus === "preparing" || rawStatus === "queued" ? "pending" :
      rawStatus === "running" || rawStatus === "streaming" ? "processing" :
      rawStatus === "succeeded" ? "completed" :
      rawStatus === "timeouted" || rawStatus === "cancelled" ? "failed" :
      rawStatus;

    // Mureka uses 'id' instead of 'task_id' in initial response
    const taskId = directResponse.task_id || directResponse.id || "unknown";

    return {
      success: true,
      taskId,
      clips,
      status: normalizedStatus,
    };
  } catch (error) {
    logger.error("[MUREKA] Music response normalization failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      taskId: "unknown",
      clips: [],
      status: "failed",
      error:
        error instanceof Error
          ? `Failed to parse response: ${error.message}`
          : "Unknown parsing error",
    };
  }
}
