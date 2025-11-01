/**
 * Get Timestamped Lyrics Edge Function
 * Retrieves synchronized lyrics with word-level timestamps from Suno API
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = "https://api.sunoapi.org";

interface TimestampedLyricsRequest {
  taskId: string;
  audioId?: string;
  musicIndex?: 0 | 1;
}

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
    // Validate API key
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    // Parse request body
    const body: TimestampedLyricsRequest = await req.json();
    const { taskId, audioId, musicIndex } = body;

    // Validate required fields
    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "taskId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("[get-timestamped-lyrics] Fetching timestamped lyrics", {
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
      logger.info("[get-timestamped-lyrics] Returning cached timestamped lyrics", { trackId: track.id });
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
        `[get-timestamped-lyrics] Suno API error: ${errorText} (status: ${sunoResponse.status}, taskId: ${taskId})`,
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
        `[get-timestamped-lyrics] Suno API returned error: ${sunoData.msg} (code: ${sunoData.code}, taskId: ${taskId})`,
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

      logger.info("[get-timestamped-lyrics] Cached timestamped lyrics in DB", { trackId: track.id });
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
    logger.error("[get-timestamped-lyrics] Unexpected error", error as Error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
