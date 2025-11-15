/**
 * @version 2.2.0
 * @since 2025-11-11
 * @changelog
 *   2.2.0 - Added Zod response validation, normalization, and detailed logging
 *   2.1.0 - Fixed authentication to use JWT token instead of X-User-Id header
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";

// ====================================================================
// 📋 REQUEST SCHEMA
// ====================================================================
const requestSchema = z.object({
  taskId: z.string().min(1, { message: "taskId is required." }),
  audioId: z.string().min(1, { message: "audioId is required." }),
});

// ====================================================================
// 📋 RESPONSE SCHEMAS
// ====================================================================

/**
 * Schema for aligned word object from Suno API
 */
const alignedWordSchema = z.object({
  word: z.string(),
  success: z.boolean().optional().default(true),
  startS: z.number(),
  endS: z.number(),
  palign: z.number().optional().default(0),
});

/**
 * Schema for normalized timestamped lyrics response
 * This is the GUARANTEED output format from this Edge Function
 */
const timestampedLyricsSchema = z.object({
  alignedWords: z.array(alignedWordSchema),
  waveformData: z.array(z.number()).optional().default([]),
  hootCer: z.number().optional().default(0),
  isStreamed: z.boolean().optional().default(false),
});

/**
 * Schema for Suno API response (multiple possible formats)
 * Format 1: { code: 200, msg: "success", data: { alignedWords: [...] } }
 * Format 2: { success: true, data: { alignedWords: [...] } }
 * Format 3: { alignedWords: [...] } (direct)
 */
const sunoResponseSchema = z.union([
  // Format 1: code + msg + data
  z.object({
    code: z.number(),
    msg: z.string(),
    data: timestampedLyricsSchema,
  }),
  // Format 2: success + data
  z.object({
    success: z.boolean(),
    data: timestampedLyricsSchema,
  }),
  // Format 3: direct data
  timestampedLyricsSchema,
  // Format 4: error response
  z.object({
    error: z.string(),
    code: z.number().optional(),
  }),
]);

type SunoResponse = z.infer<typeof sunoResponseSchema>;
type TimestampedLyricsData = z.infer<typeof timestampedLyricsSchema>;

// ====================================================================
// 🔧 HELPER FUNCTIONS
// ====================================================================

/**
 * Normalize Suno API response to consistent format
 * Handles multiple possible response shapes from Suno API
 */
function normalizeSunoResponse(response: SunoResponse): TimestampedLyricsData | null {
  try {
    // Check for error response
    if ('error' in response && response.error) {
      logger.warn("[GET-TIMESTAMPED-LYRICS] Suno API returned error", { error: response.error });
      return null;
    }

    // Format 1: { code: 200, data: {...} }
    if ('code' in response && 'data' in response) {
      if (response.code === 200) {
        return response.data;
      }
      logger.warn("[GET-TIMESTAMPED-LYRICS] Suno API returned non-200 code", { code: response.code });
      return null;
    }

    // Format 2: { success: true, data: {...} }
    if ('success' in response && 'data' in response) {
      if (response.success) {
        return response.data;
      }
      logger.warn("[GET-TIMESTAMPED-LYRICS] Suno API returned success=false");
      return null;
    }

    // Format 3: { alignedWords: [...] } (direct)
    if ('alignedWords' in response) {
      return response;
    }

    logger.error("[GET-TIMESTAMPED-LYRICS] Unable to normalize Suno response - unknown format", {
      responseKeys: Object.keys(response),
    });
    return null;
  } catch (error) {
    logger.error("[GET-TIMESTAMPED-LYRICS] Error normalizing Suno response", error as Error);
    return null;
  }
}

export async function handler(req: Request) {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Authentication failed", { error: userError });
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("[GET-TIMESTAMPED-LYRICS] User authenticated", { userId: user.id });

    if (!SUNO_API_KEY) {
      throw new Error("Suno API credentials are not configured");
    }

    const rawBody = await req.json();
    const validation = requestSchema.safeParse(rawBody);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { taskId, audioId } = validation.data;

    const sunoPayload = { taskId, audioId };

    logger.info("[GET-TIMESTAMPED-LYRICS] Calling Suno API", { taskId, audioId });

    // ✅ Call Suno API
    const sunoResponse = await fetch(
      `${SUNO_API_BASE_URL}/api/v1/generate/get-timestamped-lyrics`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUNO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sunoPayload),
      },
    );

    // ✅ Parse response
    const rawResponseData = await sunoResponse.json();

    logger.info("[GET-TIMESTAMPED-LYRICS] Suno API raw response", {
      status: sunoResponse.status,
      hasData: !!rawResponseData,
      dataKeys: rawResponseData ? Object.keys(rawResponseData) : [],
    });

    // ✅ Handle non-200 HTTP status
    if (!sunoResponse.ok) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Suno API returned error status", {
        status: sunoResponse.status,
        response: rawResponseData,
      });
      return new Response(
        JSON.stringify({
          error: rawResponseData?.error || `Suno API error: ${sunoResponse.status}`,
          details: rawResponseData,
        }),
        {
          status: sunoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ✅ Validate response schema
    const validationResult = sunoResponseSchema.safeParse(rawResponseData);

    if (!validationResult.success) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Suno API response validation failed", {
        error: validationResult.error.format(),
        rawData: JSON.stringify(rawResponseData).slice(0, 500), // Log first 500 chars
      });
      return new Response(
        JSON.stringify({
          error: "Invalid response format from Suno API",
          validationError: validationResult.error.format(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ✅ Normalize response to consistent format
    const normalizedData = normalizeSunoResponse(validationResult.data);

    if (!normalizedData) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Failed to normalize Suno response", {
        rawData: JSON.stringify(rawResponseData).slice(0, 500),
      });
      return new Response(
        JSON.stringify({
          error: "Failed to process lyrics data from Suno API",
          hint: "The response format was unexpected",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("[GET-TIMESTAMPED-LYRICS] Successfully normalized response", {
      wordCount: normalizedData.alignedWords.length,
      hasWaveform: normalizedData.waveformData && normalizedData.waveformData.length > 0,
    });

    // ✅ Return normalized, validated data
    return new Response(JSON.stringify(normalizedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(
      "[GET-TIMESTAMPED-LYRICS] Unexpected error",
      { error: error instanceof Error ? error.message : "Unknown error" },
    );
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

if (import.meta.main) {
  serve(handler);
}
