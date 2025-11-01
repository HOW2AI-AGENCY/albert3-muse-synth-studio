/**
 * Get Timestamped Lyrics Edge Function
 * Retrieves synchronized lyrics with word-level timestamps from Suno API
 * 
 * @version 1.0.0
 * @since 2025-11-02
 * @security JWT required, Zod validation, rate limiting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = "https://api.sunoapi.org";

// ✅ Zod validation schema
const requestSchema = z.object({
  taskId: z.string().min(1).max(100),
  audioId: z.string().min(1).max(100).optional(),
  musicIndex: z.union([z.literal(0), z.literal(1)]).optional(),
});

interface AlignedWord {
  word: string;
  success: boolean;
  startS: number;
  endS: number;
  palign: number;
}

interface TimestampedLyricsResponse {
  alignedWords: AlignedWord[];
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ Authentication check (X-User-Id set by JWT middleware)
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      logger.error('[GET-TIMESTAMPED-LYRICS] Missing X-User-Id from middleware');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing user context' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`[GET-TIMESTAMPED-LYRICS] ✅ User: ${userId.substring(0, 8)}...`);

    // Validate API key
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    // Parse and validate request body
    const rawBody = await req.json();
    
    // ✅ Validate input with Zod
    const validation = requestSchema.safeParse(rawBody);
    if (!validation.success) {
      logger.error('[GET-TIMESTAMPED-LYRICS] Validation failed', { errors: validation.error.format() });
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { taskId, audioId, musicIndex } = validation.data;

    logger.info("[GET-TIMESTAMPED-LYRICS] Fetching timestamped lyrics", {
      taskId,
      audioId,
      musicIndex,
    });

    // Check if we already have cached timestamped lyrics in DB
    const supabase = createSupabaseAdminClient();
    const { data: track } = await supabase
      .from("tracks")
      .select("id, metadata")
      .eq("suno_task_id", taskId)
      .single();

    if (track?.metadata?.timestamped_lyrics) {
      logger.info("[GET-TIMESTAMPED-LYRICS] Returning cached timestamped lyrics", { trackId: track.id });
      return new Response(
        JSON.stringify({
          success: true,
          data: track.metadata.timestamped_lyrics,
          cached: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Suno API
    const sunoPayload: any = { taskId };
    if (audioId) {
      sunoPayload.audioId = audioId;
    } else if (musicIndex !== undefined) {
      sunoPayload.musicIndex = musicIndex;
    }

    const sunoResponse = await fetch(
      `${SUNO_API_BASE_URL}/api/v1/generate/get-timestamped-lyrics`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUNO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sunoPayload),
      }
    );

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      logger.error(
        `[GET-TIMESTAMPED-LYRICS] Suno API error: ${errorText} (status: ${sunoResponse.status}, taskId: ${taskId})`,
        new Error(errorText)
      );

      // Handle specific error codes
      if (sunoResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (sunoResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add funds to your Suno account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to fetch timestamped lyrics from Suno API" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sunoData = await sunoResponse.json();

    if (sunoData.code !== 200) {
      logger.error(
        `[GET-TIMESTAMPED-LYRICS] Suno API returned error: ${sunoData.msg} (code: ${sunoData.code}, taskId: ${taskId})`,
        new Error(sunoData.msg)
      );
      return new Response(
        JSON.stringify({ error: sunoData.msg || "Failed to fetch timestamped lyrics" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestampedLyrics: TimestampedLyricsResponse = sunoData.data;

    // Cache in database
    if (track) {
      await supabase
        .from("tracks")
        .update({
          metadata: {
            ...track.metadata,
            timestamped_lyrics: {
              ...timestampedLyrics,
              fetched_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", track.id);

      logger.info("[GET-TIMESTAMPED-LYRICS] Cached timestamped lyrics in DB", { trackId: track.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: timestampedLyrics,
        cached: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("[GET-TIMESTAMPED-LYRICS] Unexpected error", error as Error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
