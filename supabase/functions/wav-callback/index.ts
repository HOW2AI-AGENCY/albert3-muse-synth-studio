import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = createCorsHeaders();

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const bodyText = await req.text();
    const payload = JSON.parse(bodyText);

    logger.info("wav-callback payload", payload);

    const code = payload.code;
    const data = payload.data;
    const wavTaskId = data?.task_id;
    const wavUrl = data?.audioWavUrl;

    if (!wavTaskId) {
      logger.error("Missing task_id in callback", payload);
      return new Response(JSON.stringify({ error: "Missing task_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wavJob, error: jobError } = await supabaseAdmin
      .from("wav_jobs")
      .select("*")
      .eq("suno_task_id", wavTaskId)
      .maybeSingle();

    if (jobError || !wavJob) {
      logger.error("wav_job not found", { wavTaskId, jobError });
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Processing WAV callback", {
      jobId: wavJob.id,
      trackId: wavJob.track_id,
      code,
      hasWavUrl: !!wavUrl,
    });

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      metadata: {
        ...wavJob.metadata,
        callback_received_at: new Date().toISOString(),
        callback_payload: payload,
      },
    };

    if (code === 200 && wavUrl) {
      updateData.status = "completed";
      updateData.wav_url = wavUrl;
      updateData.completed_at = new Date().toISOString();

      logger.info("WAV conversion completed", {
        jobId: wavJob.id,
        trackId: wavJob.track_id,
        wavUrl,
      });
    } else {
      updateData.status = "failed";
      updateData.error_message = payload.msg || "WAV conversion failed";

      logger.error("WAV conversion failed", {
        jobId: wavJob.id,
        trackId: wavJob.track_id,
        code,
        message: payload.msg,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("wav_jobs")
      .update(updateData)
      .eq("id", wavJob.id);

    if (updateError) {
      logger.error("Failed to update wav_job", { error: updateError, jobId: wavJob.id });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("wav-callback error", { error: error instanceof Error ? error : new Error(String(error)) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
