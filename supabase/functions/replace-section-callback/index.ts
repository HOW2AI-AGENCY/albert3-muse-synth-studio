/**
 * Replace Section Callback Handler
 * Processes callbacks from Suno API for section replacement tasks
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

interface CallbackPayload {
  code: number;
  msg: string;
  data: {
    callbackType: "complete" | "error";
    task_id: string;
    data?: Array<{
      id: string;
      audio_url: string;
      stream_audio_url?: string;
      image_url?: string;
      prompt?: string;
      model_name?: string;
      title?: string;
      tags?: string;
      createTime?: string;
      duration?: number;
    }>;
    error?: string;
  };
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const payload: CallbackPayload = await req.json();
    const { code, msg, data } = payload;
    const { callbackType, task_id, data: tracks, error } = data;

    logger.info("[replace-section-callback] Received callback", {
      code,
      callbackType,
      taskId: task_id,
    });

    const supabase = createSupabaseAdminClient();

    // Find replacement record
    const { data: replacement, error: findError } = await supabase
      .from("track_section_replacements")
      .select("*")
      .eq("suno_task_id", task_id)
      .single();

    if (findError || !replacement) {
      logger.error(
        `[replace-section-callback] Replacement record not found (taskId: ${task_id})`,
        new Error(findError?.message || 'Not found')
      );
      return new Response(
        JSON.stringify({ code: 200, msg: "Replacement record not found, but acknowledging callback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log callback
    await supabase.from("callback_logs").insert({
      function_name: "replace-section",
      task_id: task_id,
      callback_type: callbackType,
      status_code: code,
      payload: payload,
    });

    if (code === 200 && callbackType === "complete" && tracks && tracks.length > 0) {
      // Success - create track version
      const trackData = tracks[0];
      const parentTrack = await supabase
        .from("tracks")
        .select("*")
        .eq("id", replacement.parent_track_id)
        .single();

      if (!parentTrack.data) {
        logger.error(
          `[replace-section-callback] Parent track not found (parentTrackId: ${replacement.parent_track_id})`,
          new Error("Parent track not found")
        );
        return new Response(
          JSON.stringify({ code: 200, msg: "Parent track not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get next version number
      const { data: existingVersions } = await supabase
        .from("track_versions")
        .select("version_number")
        .eq("parent_track_id", replacement.parent_track_id)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersionNumber = (existingVersions?.[0]?.version_number || 0) + 1;

      // Create new version
      const { data: newVersion, error: versionError } = await supabase
        .from("track_versions")
        .insert({
          parent_track_id: replacement.parent_track_id,
          version_number: nextVersionNumber,
          is_master: false,
          audio_url: trackData.audio_url,
          cover_url: trackData.image_url || parentTrack.data.cover_url,
          duration: trackData.duration || parentTrack.data.duration,
          suno_id: trackData.id,
          metadata: {
            source: "replace_section",
            replacement_id: replacement.id,
            replaced_segment: {
              start: replacement.replaced_start_s,
              end: replacement.replaced_end_s,
            },
            original_task_id: task_id,
            created_from_callback: true,
          },
        })
        .select()
        .single();

      if (versionError) {
        logger.error("[replace-section-callback] Failed to create version", versionError);
      } else {
        // Update replacement record
        await supabase
          .from("track_section_replacements")
          .update({
            status: "completed",
            replacement_audio_url: trackData.audio_url,
            version_id: newVersion.id,
            metadata: {
              ...replacement.metadata,
              suno_audio_id: trackData.id,
              completed_at: new Date().toISOString(),
            },
          })
          .eq("id", replacement.id);

        logger.info("[replace-section-callback] Section replacement completed", {
          replacementId: replacement.id,
          versionId: newVersion.id,
        });
      }
    } else {
      // Error case
      await supabase
        .from("track_section_replacements")
        .update({
          status: "failed",
          error_message: error || msg || "Unknown error",
        })
        .eq("id", replacement.id);

      logger.error(
        `[replace-section-callback] Section replacement failed: ${msg} (code: ${code}, error: ${error})`,
        new Error(msg)
      );
    }

    return new Response(
      JSON.stringify({ code: 200, msg: "success" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("[replace-section-callback] Unexpected error", error as Error);
    return new Response(
      JSON.stringify({ code: 200, msg: "error processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
