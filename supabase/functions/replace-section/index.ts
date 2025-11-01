/**
 * Replace Music Section Edge Function
 * Replaces a specific time segment within existing music
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = "https://api.sunoapi.org";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface ReplaceSectionRequest {
  trackId: string;
  taskId: string;
  musicIndex: 0 | 1;
  prompt: string;
  tags: string;
  title: string;
  negativeTags?: string;
  infillStartS: number;
  infillEndS: number;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    // Parse request body
    const body: ReplaceSectionRequest = await req.json();
    const {
      trackId,
      taskId,
      musicIndex,
      prompt,
      tags,
      title,
      negativeTags,
      infillStartS,
      infillEndS,
    } = body;

    // Validate required fields
    if (!trackId || !taskId || musicIndex === undefined || !prompt || !tags || !title || 
        infillStartS === undefined || infillEndS === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate time range
    if (infillStartS < 0) {
      return new Response(
        JSON.stringify({ error: "infillStartS must be >= 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (infillEndS <= infillStartS) {
      return new Response(
        JSON.stringify({ error: "infillEndS must be > infillStartS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sectionDuration = infillEndS - infillStartS;
    if (sectionDuration < 5) {
      return new Response(
        JSON.stringify({ error: "Section must be at least 5 seconds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (sectionDuration > 30) {
      return new Response(
        JSON.stringify({ error: "Section must be at most 30 seconds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("[replace-section] Starting section replacement", {
      trackId,
      taskId,
      musicIndex,
      infillStartS,
      infillEndS,
      userId: user.id,
    });

    // Verify track ownership
    const supabase = createSupabaseAdminClient();
    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("id, user_id, duration_seconds, suno_task_id")
      .eq("id", trackId)
      .single();

    if (trackError || !track) {
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (track.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to modify this track" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate end time doesn't exceed track duration
    if (track.duration_seconds && infillEndS > track.duration_seconds) {
      return new Response(
        JSON.stringify({ error: `infillEndS cannot exceed track duration (${track.duration_seconds}s)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create replacement record
    const { data: replacement, error: replacementError } = await supabase
      .from("track_section_replacements")
      .insert({
        parent_track_id: trackId,
        replaced_start_s: infillStartS,
        replaced_end_s: infillEndS,
        prompt,
        tags,
        negative_tags: negativeTags,
        status: "pending",
        metadata: {
          original_task_id: taskId,
          music_index: musicIndex,
        },
      })
      .select()
      .single();

    if (replacementError) {
      logger.error("[replace-section] Failed to create replacement record", replacementError);
      return new Response(
        JSON.stringify({ error: "Failed to create replacement record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Suno API
    const callBackUrl = `${SUPABASE_URL}/functions/v1/replace-section-callback`;
    const sunoPayload = {
      taskId,
      musicIndex,
      prompt,
      tags,
      title,
      negativeTags: negativeTags || "",
      infillStartS: Number(infillStartS.toFixed(2)),
      infillEndS: Number(infillEndS.toFixed(2)),
      callBackUrl,
    };

    const sunoResponse = await fetch(
      `${SUNO_API_BASE_URL}/api/v1/generate/replace-section`,
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
        `[replace-section] Suno API error: ${errorText} (status: ${sunoResponse.status})`,
        new Error(errorText)
      );

      // Update replacement status to failed
      await supabase
        .from("track_section_replacements")
        .update({
          status: "failed",
          error_message: `Suno API error: ${errorText}`,
        })
        .eq("id", replacement.id);

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
        JSON.stringify({ error: "Failed to submit replacement request to Suno API" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sunoData = await sunoResponse.json();

    if (sunoData.code !== 200) {
      logger.error(
        `[replace-section] Suno API returned error: ${sunoData.msg} (code: ${sunoData.code})`,
        new Error(sunoData.msg)
      );

      await supabase
        .from("track_section_replacements")
        .update({
          status: "failed",
          error_message: sunoData.msg,
        })
        .eq("id", replacement.id);

      return new Response(
        JSON.stringify({ error: sunoData.msg || "Failed to replace section" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newTaskId = sunoData.data.taskId;

    // Update replacement record with task ID
    await supabase
      .from("track_section_replacements")
      .update({
        suno_task_id: newTaskId,
        status: "processing",
      })
      .eq("id", replacement.id);

    logger.info("[replace-section] Section replacement submitted", {
      replacementId: replacement.id,
      sunoTaskId: newTaskId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        replacementId: replacement.id,
        taskId: newTaskId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("[replace-section] Unexpected error", error as Error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
