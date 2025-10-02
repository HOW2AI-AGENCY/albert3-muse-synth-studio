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

    console.log("Suno callback payload:", JSON.stringify(payload, null, 2));

    // Extract tracks array from payload
    // Suno can send: { data: { data: [...] } } or { data: [...] } or just single task
    let tasks: any[] = [];
    if (payload?.data?.data && Array.isArray(payload.data.data)) {
      // New format: { data: { data: [...], task_id: "..." } }
      tasks = payload.data.data;
    } else if (Array.isArray(payload?.data)) {
      // Alternative format: { data: [...] }
      tasks = payload.data;
    } else if (payload?.audio_url || payload?.audioUrl) {
      // Single task format
      tasks = [payload];
    }

    // Extract taskId with support for both taskId and task_id
    const taskId = 
      payload?.data?.task_id ||  // New Suno format
      payload?.data?.taskId ||
      payload?.taskId || 
      payload?.task_id ||
      tasks?.[0]?.taskId || 
      tasks?.[0]?.task_id ||
      payload?.id;

    if (!taskId) {
      console.error("Suno callback: missing taskId. Available keys:", Object.keys(payload), Object.keys(payload?.data || {}));
      return new Response(JSON.stringify({ ok: false, error: "missing_taskId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracted taskId:", taskId, "Tasks count:", tasks.length);

    // Find the track by metadata.suno_task_id
    const { data: track, error: findErr } = await supabase
      .from("tracks")
      .select("id, status, user_id")
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

    // Process successful tasks - Suno returns 2 versions, save both as separate tracks
    if (successTask) {
      const firstAudioUrl = successTask.audioUrl || successTask.audio_url;
      const firstDuration = successTask.duration || successTask.duration_seconds || 0;
      const actualLyrics = successTask.prompt || successTask.lyric || successTask.lyrics;
      const title = successTask.title || "Generated Track";

      // Update the original track with first version
      await supabase
        .from("tracks")
        .update({
          status: "completed",
          audio_url: firstAudioUrl,
          duration: Math.round(firstDuration),
          duration_seconds: Math.round(firstDuration),
          lyrics: actualLyrics,
          title: title,
          metadata: { suno_data: tasks, suno_task_id: taskId },
        })
        .eq("id", track.id);

      console.log("Suno callback: track completed", { taskId, audioUrl: firstAudioUrl, versionsCount: tasks.length });

      // If there's a second version, create a new track for it
      if (tasks.length > 1 && tasks[1]) {
        const secondTask = tasks[1];
        const secondAudioUrl = secondTask.audioUrl || secondTask.audio_url;
        
        if (secondAudioUrl && track.user_id) {
          const { data: originalTrack } = await supabase
            .from("tracks")
            .select("user_id, title, prompt, provider, has_vocals, style_tags, lyrics")
            .eq("id", track.id)
            .single();

          if (originalTrack) {
            await supabase
              .from("tracks")
              .insert({
                user_id: originalTrack.user_id,
                title: `${secondTask.title || originalTrack.title} (v2)`,
                prompt: originalTrack.prompt,
                audio_url: secondAudioUrl,
                duration: Math.round(secondTask.duration || secondTask.duration_seconds || 0),
                duration_seconds: Math.round(secondTask.duration || secondTask.duration_seconds || 0),
                status: "completed",
                provider: "suno",
                lyrics: secondTask.prompt || secondTask.lyric || secondTask.lyrics || originalTrack.lyrics,
                has_vocals: originalTrack.has_vocals,
                style_tags: originalTrack.style_tags,
                metadata: { suno_data: secondTask, suno_task_id: taskId, version: 2 },
              });

            console.log("Suno callback: created second version track", { secondAudioUrl });
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, versionsCreated: tasks.length }), {
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