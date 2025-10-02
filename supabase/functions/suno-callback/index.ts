import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const bodyText = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(bodyText || "{}");
    } catch (e) {
      console.error("Suno callback: invalid JSON", bodyText);
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Suno callback payload:", payload);

    // Normalize payload to an array of tasks
    const tasks = Array.isArray(payload?.data) && payload.data.length > 0
      ? payload.data
      : [payload];

    // Extract taskId flexibly
    const taskId = payload?.taskId || tasks?.[0]?.taskId || payload?.id || payload?.data?.taskId;
    if (!taskId) {
      console.error("Suno callback: missing taskId in payload");
      return new Response(JSON.stringify({ ok: false, error: "missing_taskId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the track by metadata.suno_task_id
    const { data: track, error: findErr } = await supabase
      .from("tracks")
      .select("id, status")
      .contains("metadata", { suno_task_id: taskId })
      .maybeSingle();

    if (findErr) {
      console.error("Suno callback: error finding track:", findErr);
      return new Response(JSON.stringify({ ok: false, error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!track) {
      console.warn("Suno callback: no track found for taskId:", taskId);
      return new Response(JSON.stringify({ ok: true, message: "no_track" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decide final status
    const anyFailed = tasks.some((t: any) => ["error", "failed"].includes((t?.status || "").toLowerCase()));
    const successTask = tasks.find((t: any) => t?.audioUrl || t?.audio_url);

    if (anyFailed && !successTask) {
      const firstErr = tasks.find((t: any) => ["error", "failed"].includes((t?.status || "").toLowerCase()));
      const reason = firstErr?.msg || firstErr?.error || "Generation failed (callback)";

      await supabase
        .from("tracks")
        .update({ status: "failed", error_message: reason })
        .contains("metadata", { suno_task_id: taskId });

      console.log("Suno callback: track marked failed", { taskId, reason });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (successTask) {
      const audioUrl = successTask.audioUrl || successTask.audio_url;
      const duration = successTask.duration || 0;
      const actualLyrics = successTask.lyric || successTask.lyrics;

      await supabase
        .from("tracks")
        .update({
          status: "completed",
          audio_url: audioUrl,
          duration: Math.round(duration),
          lyrics: actualLyrics,
          metadata: { suno_data: tasks },
        })
        .contains("metadata", { suno_task_id: taskId });

      console.log("Suno callback: track completed", { taskId, audioUrl });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If still processing, update status to processing
    await supabase
      .from("tracks")
      .update({ status: "processing" })
      .contains("metadata", { suno_task_id: taskId });

    console.log("Suno callback: track still processing", { taskId });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suno callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});