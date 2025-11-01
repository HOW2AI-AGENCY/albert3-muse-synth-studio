/**
 * Replace Music Section Edge Function
 * Replaces a specific time segment within existing music
 * 
 * @version 1.0.0
 * @since 2025-11-02
 * @security JWT required, Zod validation, ownership check, rate limiting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = "https://api.sunoapi.org";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

// ✅ Zod validation schema
const requestSchema = z.object({
  trackId: z.string().uuid(),
  taskId: z.string().min(1).max(100),
  musicIndex: z.union([z.literal(0), z.literal(1)]),
  prompt: z.string().min(1).max(1000).trim(),
  tags: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  negativeTags: z.string().max(200).optional(),
  infillStartS: z.number().min(0).max(300),
  infillEndS: z.number().min(5).max(300),
});

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ Authentication check (X-User-Id set by JWT middleware)
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      logger.error('[REPLACE-SECTION] Missing X-User-Id from middleware');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing user context' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`[REPLACE-SECTION] ✅ User: ${userId.substring(0, 8)}...`);

    // Validate API key
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    // Parse and validate request body
    const rawBody = await req.json();
    
    // ✅ Validate input with Zod
    const validation = requestSchema.safeParse(rawBody);
    if (!validation.success) {
      logger.error('[REPLACE-SECTION] Validation failed', { errors: validation.error.format() });
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    } = validation.data;

    // Additional validation
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

    logger.info("[REPLACE-SECTION] Starting section replacement", {
      trackId,
      taskId,
      musicIndex,
      infillStartS,
      infillEndS,
      userId: userId.substring(0, 8),
    });

    // ✅ Verify track ownership
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

    if (track.user_id !== userId) {
      logger.error("[REPLACE-SECTION] Unauthorized - user does not own track");
      return new Response(
        JSON.stringify({ error: "Unauthorized - you do not own this track" }),
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
      logger.error("[REPLACE-SECTION] Failed to create replacement record", replacementError);
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
        `[REPLACE-SECTION] Suno API error: ${errorText} (status: ${sunoResponse.status})`,
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
        `[REPLACE-SECTION] Suno API returned error: ${sunoData.msg} (code: ${sunoData.code})`,
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

    logger.info("[REPLACE-SECTION] Section replacement submitted", {
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
    logger.error("[REPLACE-SECTION] Unexpected error", error as Error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
