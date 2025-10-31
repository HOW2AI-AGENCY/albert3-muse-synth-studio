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
  logger.debug("[MUREKA] Starting music response normalization");

  try {
    const validated = MurekaMusicResponseSchema.parse(rawResponse);
    logger.debug("[MUREKA] Schema validation successful");

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
          taskId: wrappedResponse.data?.task_id || "unknown",
          clips: [],
          status: "failed",
          error: wrappedResponse.msg,
        };
      }

      const clips = wrappedResponse.data?.clips || wrappedResponse.data?.data || [];
      logger.debug("[MUREKA] Extracted clips from wrapped response", {
        count: clips.length,
      });

      // Normalize status: "preparing" → "pending"
      let normalizedStatus = wrappedResponse.data?.status || "pending";
      if (normalizedStatus === "preparing") {
        normalizedStatus = "pending";
      }

      return {
        success: true,
        taskId: wrappedResponse.data?.task_id || "unknown",
        clips,
        status: normalizedStatus,
      };
    }

    // Handle direct response
    const directResponse = validated;
    const clips = directResponse.clips || directResponse.data || [];
    logger.debug("[MUREKA] Extracted clips from direct response", {
      count: clips.length,
    });

    // Normalize status: "preparing" → "pending"
    let normalizedStatus = directResponse.status || "pending";
    if (normalizedStatus === "preparing") {
      normalizedStatus = "pending";
    }

    return {
      success: true,
      taskId: directResponse.task_id,
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
