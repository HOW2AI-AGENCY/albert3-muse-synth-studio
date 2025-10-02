import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders()
};

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit

function sanitizeText(text: string | undefined): string | null {
  if (!text) return null;
  // Remove potential XSS vectors and limit length
  return text.replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .substring(0, 10000);
}

const mainHandler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check content length before reading
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      console.error('Payload too large:', contentLength);
      return new Response(
        JSON.stringify({ ok: false, error: 'payload_too_large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bodyText = await req.text();
    
    // Additional size check after reading
    if (bodyText.length > MAX_PAYLOAD_SIZE) {
      console.error('Payload too large after read:', bodyText.length);
      return new Response(
        JSON.stringify({ ok: false, error: 'payload_too_large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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
    const successTask = tasks.find((t: any) => 
      t?.audioUrl || t?.audio_url || t?.stream_audio_url || t?.source_stream_audio_url
    );

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

    // Process successful tasks - save versions using track_versions table
    if (successTask && tasks.length > 0) {
      // Extract metadata from first task
      const firstTask = tasks[0];
      const firstAudioUrl = firstTask.audioUrl || firstTask.audio_url || 
                           firstTask.stream_audio_url || firstTask.source_stream_audio_url;
      const firstDuration = firstTask.duration || firstTask.duration_seconds || 0;
      const actualLyrics = sanitizeText(firstTask.prompt || firstTask.lyric || firstTask.lyrics);
      const title = sanitizeText(firstTask.title) || "Generated Track";
      const coverUrl = firstTask.image_url || firstTask.image_large_url || firstTask.imageUrl;
      const videoUrl = firstTask.video_url || firstTask.videoUrl;
      const sunoId = sanitizeText(firstTask.id);
      const modelName = sanitizeText(firstTask.model || firstTask.model_name);
      const createdAtSuno = firstTask.created_at || firstTask.createdAt;
      const tagsString = firstTask.tags || '';
      const styleTags = tagsString ? tagsString.split(/[,;]/).map((t: string) => sanitizeText(t)).filter(Boolean) : null;
      
      console.log("Suno callback: Full metadata", { 
        audioUrl: firstAudioUrl?.substring(0, 50),
        coverUrl: coverUrl?.substring(0, 50),
        videoUrl: videoUrl?.substring(0, 50),
        sunoId,
        modelName,
        title,
        lyrics: actualLyrics?.substring(0, 50)
      });

      // Update the parent track with first version metadata
      await supabase
        .from("tracks")
        .update({
          status: "completed",
          audio_url: firstAudioUrl,
          duration: Math.round(firstDuration),
          duration_seconds: Math.round(firstDuration),
          lyrics: actualLyrics,
          title: title,
          cover_url: coverUrl,
          video_url: videoUrl,
          suno_id: sunoId,
          model_name: modelName,
          created_at_suno: createdAtSuno,
          style_tags: styleTags,
          metadata: { suno_data: tasks, suno_task_id: taskId },
        })
        .eq("id", track.id);

      // Save all versions to track_versions table
      for (let i = 0; i < tasks.length; i++) {
        const versionTask = tasks[i];
        const versionAudioUrl = versionTask.audioUrl || versionTask.audio_url || 
                               versionTask.stream_audio_url || versionTask.source_stream_audio_url;
        
        if (!versionAudioUrl) continue;

        console.log(`[suno-callback] Saving version ${i + 1}:`, {
          parent_track_id: track.id,
          version_number: i + 1,
          audio_url: versionAudioUrl?.substring(0, 50)
        });

        const { data: insertedVersion, error: versionError } = await supabase
          .from("track_versions")
          .insert({
            parent_track_id: track.id,
            version_number: i + 1,
            is_master: i === 0,
            suno_id: sanitizeText(versionTask.id),
            audio_url: versionAudioUrl,
            video_url: versionTask.video_url || versionTask.videoUrl,
            cover_url: versionTask.image_url || versionTask.image_large_url || versionTask.imageUrl,
            lyrics: sanitizeText(versionTask.prompt || versionTask.lyric || versionTask.lyrics),
            duration: Math.round(versionTask.duration || versionTask.duration_seconds || 0),
            metadata: { suno_data: versionTask }
          })
          .select()
          .single();

        if (versionError) {
          console.error(`[suno-callback] Error saving version ${i + 1}:`, versionError);
        } else {
          console.log(`[suno-callback] Version ${i + 1} saved with ID:`, insertedVersion?.id);
        }
      }

      console.log("Suno callback: track completed", { taskId, audioUrl: firstAudioUrl, versionsCount: tasks.length });

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
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
  keyGenerator: (req) => {
    // For callbacks, use IP-based rate limiting since they come from external services
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `callback_${ip}`;
  }
});

serve(handler);