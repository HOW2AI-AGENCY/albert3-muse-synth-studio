/**
 * Replace Section Callback Handler
 * Processes completion notifications from Suno API for section replacement tasks
 * 
 * @version 1.0.0
 * @since 2025-11-02
 * @security HMAC signature verification, public endpoint
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { verifyWebhookSignature } from "../_shared/webhook-verify.ts";

interface CallbackMusic {
  id: string;
  audio_url: string;
  stream_audio_url: string;
  image_url: string;
  prompt: string;
  model_name: string;
  title: string;
  tags: string;
  createTime: string;
  duration: number;
}

interface CallbackPayload {
  code: number;
  msg: string;
  data: {
    callbackType: 'complete' | 'error';
    task_id: string;
    data?: CallbackMusic[];
    error?: string;
  };
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ HMAC signature verification (if secret is configured)
    const SUNO_WEBHOOK_SECRET = Deno.env.get('SUNO_WEBHOOK_SECRET');
    let payload: CallbackPayload;
    
    if (SUNO_WEBHOOK_SECRET) {
      const signature = req.headers.get('X-Suno-Signature');
      
      if (!signature) {
        logger.error('[REPLACE-SECTION-CALLBACK] Missing X-Suno-Signature header');
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const bodyText = await req.text();
      const isValid = await verifyWebhookSignature(bodyText, signature, SUNO_WEBHOOK_SECRET);
      
      if (!isValid) {
        logger.error('[REPLACE-SECTION-CALLBACK] Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      payload = JSON.parse(bodyText);
      logger.info('[REPLACE-SECTION-CALLBACK] ✅ Signature verified');
    } else {
      logger.warn('[REPLACE-SECTION-CALLBACK] ⚠️ SUNO_WEBHOOK_SECRET not configured - skipping signature verification');
      payload = await req.json();
    }

    // Process callback
    return await processCallback(payload, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[REPLACE-SECTION-CALLBACK] Error processing callback", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processCallback(payload: CallbackPayload, corsHeaders: Record<string, string>) {
  try {
    const { code, msg, data } = payload;
    const { callbackType, task_id } = data;

    logger.info("[REPLACE-SECTION-CALLBACK] Received callback", {
      code,
      msg,
      callbackType,
      task_id,
    });

    const supabase = createSupabaseAdminClient();

    // Find replacement record
    const { data: replacement, error: replacementError } = await supabase
      .from("track_section_replacements")
      .select("*")
      .eq("suno_task_id", task_id)
      .single();

    if (replacementError || !replacement) {
      logger.error("[REPLACE-SECTION-CALLBACK] Replacement not found", { task_id, error: replacementError?.message });
      return new Response(
        JSON.stringify({ error: "Replacement not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log callback
    await supabase
      .from("callback_logs")
      .insert({
        callback_type: "replace_section",
        track_id: replacement.parent_track_id,
        payload: payload as any,
      });

    // Handle success
    if (callbackType === 'complete' && code === 200 && data.data && data.data.length > 0) {
      const music = data.data[0];

      logger.info("[REPLACE-SECTION-CALLBACK] Replacement completed", {
        replacementId: replacement.id,
        audioUrl: music.audio_url,
      });

      // Get parent track
      const { data: parentTrack } = await supabase
        .from("tracks")
        .select("id")
        .eq("id", replacement.parent_track_id)
        .single();

      if (parentTrack) {
        // Determine next version number
        const { data: versions } = await supabase
          .from("track_versions")
          .select("variant_index")
          .eq("parent_track_id", parentTrack.id)
          .order("variant_index", { ascending: false })
          .limit(1);

        const nextVersionNumber = versions && versions.length > 0 
          ? versions[0].variant_index + 1 
          : 1;

        // Create new version
        const { data: newVersion, error: versionError } = await supabase
          .from("track_versions")
          .insert({
            parent_track_id: parentTrack.id,
            variant_index: nextVersionNumber,
            audio_url: music.audio_url,
            cover_url: music.image_url,
            lyrics: null,
            duration: Math.round(music.duration),
            suno_id: music.id,
            is_primary_variant: false,
            is_preferred_variant: false,
            metadata: {
              source: 'section_replacement',
              replacement_id: replacement.id,
              replaced_start_s: replacement.replaced_start_s,
              replaced_end_s: replacement.replaced_end_s,
              prompt: music.prompt,
              tags: music.tags,
              model_name: music.model_name,
              created_at: music.createTime,
            },
          })
          .select()
          .single();

        if (versionError) {
          logger.error("[REPLACE-SECTION-CALLBACK] Failed to create version", versionError);
        }

        // Update replacement record
        await supabase
          .from("track_section_replacements")
          .update({
            status: "completed",
            replacement_audio_url: music.audio_url,
            version_id: newVersion?.id,
            metadata: {
              ...replacement.metadata,
              completed_at: new Date().toISOString(),
              suno_music_id: music.id,
              duration: music.duration,
            },
          })
          .eq("id", replacement.id);

        logger.info("[REPLACE-SECTION-CALLBACK] Version created", { versionId: newVersion?.id });
      }
    } else {
      // Handle error
      logger.error("[REPLACE-SECTION-CALLBACK] Replacement failed", {
        msg,
        error: data.error,
      });

      await supabase
        .from("track_section_replacements")
        .update({
          status: "failed",
          error_message: data.error || msg || "Unknown error",
        })
        .eq("id", replacement.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[REPLACE-SECTION-CALLBACK] Error in processCallback", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
