import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import {
  downloadAndUploadAudio,
  downloadAndUploadCover,
  downloadAndUploadVideo,
} from "../_shared/storage.ts";
import { autoSaveLyrics } from "../_shared/auto-save-lyrics.ts";

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
    // ✅ Webhook signature verification enabled
    const signature = req.headers.get('X-Suno-Signature');
    const SUNO_WEBHOOK_SECRET = Deno.env.get('SUNO_WEBHOOK_SECRET');
    
    if (SUNO_WEBHOOK_SECRET) {
      if (!signature) {
        console.error('[suno-callback] Missing webhook signature');
        return new Response(JSON.stringify({ ok: false, error: 'missing_signature' }), {
          status: 401,
          headers: corsHeaders
        });
      }
      
      const bodyText = await req.text();
      const { verifyWebhookSignature } = await import('../_shared/webhook-verify.ts');
      const isValid = await verifyWebhookSignature(bodyText, signature, SUNO_WEBHOOK_SECRET);
      
      if (!isValid) {
        console.error('[suno-callback] Invalid webhook signature');
        return new Response(JSON.stringify({ ok: false, error: 'invalid_signature' }), {
          status: 401,
          headers: corsHeaders
        });
      }
    } else {
      console.warn('[suno-callback] SUNO_WEBHOOK_SECRET not configured - skipping signature verification');
    }
    
    const supabase = createSupabaseAdminClient();

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

    const callbackType = payload?.callbackType || 'unknown';

    console.log("Extracted taskId:", taskId, "Tasks count:", tasks.length, "Callback type:", callbackType);

    // ✅ Removed ai_jobs status update - using tracks table only

    // Find the track by metadata.suno_task_id
    const { data: track, error: findErr } = await supabase
      .from("tracks")
      .select("id, title, prompt, status, user_id, metadata")
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

    // Process successful tasks - persist assets and versions
    if (successTask && tasks.length > 0) {
      const successfulTracks = tasks.filter((t: any) =>
        t?.audioUrl || t?.audio_url || t?.stream_audio_url || t?.source_stream_audio_url
      );

      if (successfulTracks.length === 0) {
        const message = "Completed without audio URL in callback";
        await supabase
          .from("tracks")
          .update({ status: "failed", error_message: message })
          .contains("metadata", { suno_task_id: taskId });
        console.error("Suno callback: no successful tracks with audio", { taskId });
        return new Response(JSON.stringify({ ok: false, error: message }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!track.user_id) {
        const message = "Track missing user reference";
        console.error("Suno callback: unable to determine user for track", { taskId, trackId: track.id });
        return new Response(JSON.stringify({ ok: false, error: message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callbackType = payload?.data?.callbackType || payload?.data?.callback_type || null;
      const callbackCode = typeof payload?.code === "number" ? payload.code : null;
      const existingMetadata = (track.metadata && typeof track.metadata === "object")
        ? track.metadata as Record<string, unknown>
        : {};

      const mainTrack = successfulTracks[0];
      const externalAudioUrl = mainTrack.audioUrl || mainTrack.audio_url
        || mainTrack.stream_audio_url || mainTrack.source_stream_audio_url;
      const externalCoverUrl = mainTrack.image_url || mainTrack.image_large_url || mainTrack.imageUrl;
      const externalVideoUrl = mainTrack.video_url || mainTrack.videoUrl;
      const duration = Math.round(mainTrack.duration || mainTrack.duration_seconds || 0);
      const sanitizedTitle = sanitizeText(mainTrack.title) || "Generated Track";
      const sanitizedLyrics = sanitizeText(mainTrack.prompt || mainTrack.lyric || mainTrack.lyrics);
      const sanitizedModelName = sanitizeText(mainTrack.model || mainTrack.model_name);
      const sanitizedSunoId = sanitizeText(mainTrack.id);
      
      // ✅ FIX: Convert Unix timestamp to ISO 8601
      const createdAtSuno = (() => {
        const rawTime = mainTrack.created_at || mainTrack.createTime || mainTrack.createdAt;
        if (!rawTime) return null;
        
        // If it's a number (Unix timestamp in milliseconds)
        if (typeof rawTime === 'number') {
          return new Date(rawTime).toISOString();
        }
        
        // If it's already a string (ISO or other format)
        if (typeof rawTime === 'string') {
          const parsed = new Date(rawTime);
          return isNaN(parsed.getTime()) ? null : parsed.toISOString();
        }
        
        return null;
      })();
      
      // Only update title if it was auto-generated
      const currentTitle = track.title || '';
      const isAutoGeneratedTitle = 
        !currentTitle || 
        currentTitle === 'Untitled Track' || 
        currentTitle === 'Generated Track' ||
        // Check if title is truncated prompt (first 50 chars)
        (track.prompt && currentTitle === track.prompt.substring(0, 50));

      console.log("Suno callback: processing main track", {
        trackId: track.id,
        taskId,
        audioPreview: externalAudioUrl?.substring(0, 60),
        coverPreview: externalCoverUrl?.substring(0, 60),
        videoPreview: externalVideoUrl?.substring(0, 60),
        sanitizedTitle,
        callbackType,
      });

      let uploadedAudioUrl = externalAudioUrl || null;
      if (externalAudioUrl) {
        uploadedAudioUrl = await downloadAndUploadAudio(externalAudioUrl, track.id, track.user_id, "main.mp3", supabase);
      }

      let uploadedCoverUrl = externalCoverUrl || null;
      if (externalCoverUrl) {
        uploadedCoverUrl = await downloadAndUploadCover(externalCoverUrl, track.id, track.user_id, "cover.jpg", supabase);
      }

      let uploadedVideoUrl = externalVideoUrl || null;
      if (externalVideoUrl) {
        uploadedVideoUrl = await downloadAndUploadVideo(externalVideoUrl, track.id, track.user_id, "video.mp4", supabase);
      }

      const rawTags = Array.isArray(mainTrack.tags)
        ? mainTrack.tags.join(",")
        : typeof mainTrack.tags === "string"
          ? mainTrack.tags
          : "";
      const styleTags = rawTags
        ? rawTags
            .split(/[,;]/)
            .map((tag: string) => sanitizeText(tag) || undefined)
            .filter((tag: string | undefined): tag is string => Boolean(tag))
        : null;

      const metadataUpdate = {
        ...existingMetadata,
        suno_task_id: taskId,
        suno_callback_received_at: new Date().toISOString(),
        suno_callback_type: callbackType,
        suno_callback_code: callbackCode,
        suno_data: successfulTracks,
      };

      const updateData: any = {
        status: "completed",
        audio_url: uploadedAudioUrl,
        duration,
        duration_seconds: duration,
        lyrics: sanitizedLyrics,
        cover_url: uploadedCoverUrl,
        video_url: uploadedVideoUrl,
        suno_id: sanitizedSunoId,
        model_name: sanitizedModelName,
        created_at_suno: createdAtSuno,
        style_tags: styleTags,
        metadata: metadataUpdate,
      };
      
      // Only update title if it was auto-generated
      if (isAutoGeneratedTitle && sanitizedTitle && sanitizedTitle !== 'Generated Track') {
        updateData.title = sanitizedTitle;
        console.log('✅ Auto-generated title updated:', { 
          old: currentTitle, 
          new: sanitizedTitle 
        });
      } else {
        console.log('ℹ️ Keeping user-defined title:', currentTitle);
      }
      
      try {
        const { error: updateTrackError } = await supabase
          .from("tracks")
          .update(updateData)
          .eq("id", track.id);

        if (updateTrackError) {
          // Save error in metadata for debugging
          await supabase
            .from("tracks")
            .update({
              metadata: {
                ...existingMetadata,
                callback_error: {
                  timestamp: new Date().toISOString(),
                  error: updateTrackError.message,
                  code: updateTrackError.code,
                  attempted_data: {
                    created_at_suno: createdAtSuno,
                    audio_url: uploadedAudioUrl ? 'present' : 'missing'
                  }
                }
              }
            })
            .eq("id", track.id);
          
          console.error("Suno callback: failed to update main track", updateTrackError);
          
          // Return 500 so Suno retries the callback
          return new Response(JSON.stringify({ 
            ok: false, 
            error: "update_failed", 
            details: updateTrackError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (unexpectedError) {
        console.error("Suno callback: unexpected error", unexpectedError);
        
        // Fallback: mark as failed with details
        await supabase
          .from("tracks")
          .update({
            status: "failed",
            error_message: `Callback processing error: ${unexpectedError instanceof Error ? unexpectedError.message : 'Unknown'}`,
            metadata: {
              ...existingMetadata,
              callback_crash: {
                timestamp: new Date().toISOString(),
                error: String(unexpectedError)
              }
            }
          })
          .eq("id", track.id);
        
        throw unexpectedError;
      }

      console.log("Suno callback: main track updated successfully", { trackId: track.id, taskId });

      // ✅ Auto-save lyrics to saved_lyrics table
      if (sanitizedLyrics && track.user_id) {
        await autoSaveLyrics(supabase, {
          trackId: track.id,
          userId: track.user_id,
          title: sanitizedTitle,
          lyrics: sanitizedLyrics,
          prompt: track.prompt,
          tags: styleTags || [],
        });
      }

      if (successfulTracks.length > 1) {
        for (let i = 1; i < successfulTracks.length; i++) {
          const versionTrack = successfulTracks[i];
          const versionExternalAudioUrl = versionTrack.audioUrl || versionTrack.audio_url
            || versionTrack.stream_audio_url || versionTrack.source_stream_audio_url;
          if (!versionExternalAudioUrl) {
            console.warn(`[suno-callback] Version ${i} missing audio URL, skipping`);
            continue;
          }

          const versionAudioUrl = await downloadAndUploadAudio(
            versionExternalAudioUrl,
            track.id,
            track.user_id,
            `version-${i}.mp3`,
            supabase,
          );

          let versionCoverUrl = versionTrack.image_url || versionTrack.image_large_url || versionTrack.imageUrl || null;
          if (versionCoverUrl) {
            versionCoverUrl = await downloadAndUploadCover(
              versionCoverUrl,
              track.id,
              track.user_id,
              `version-${i}-cover.jpg`,
              supabase,
            );
          }

          let versionVideoUrl = versionTrack.video_url || versionTrack.videoUrl || null;
          if (versionVideoUrl) {
            versionVideoUrl = await downloadAndUploadVideo(
              versionVideoUrl,
              track.id,
              track.user_id,
              `version-${i}-video.mp4`,
              supabase,
            );
          }

          const versionMetadata = {
            suno_track_data: versionTrack,
            generated_via: "callback",
            suno_task_id: taskId,
          };

          // ✅ Check if version already exists (prevent duplicates from retry callbacks)
          const { data: existingVersion } = await supabase
            .from("track_versions")
            .select("id")
            .eq("parent_track_id", track.id)
            .eq("variant_index", i)
            .maybeSingle();

          if (existingVersion) {
            // Update existing version
            const { error: versionError } = await supabase
              .from("track_versions")
              .update({
                suno_id: sanitizeText(versionTrack.id),
                audio_url: versionAudioUrl,
                video_url: versionVideoUrl,
                cover_url: versionCoverUrl,
                lyrics: sanitizeText(versionTrack.prompt || versionTrack.lyric || versionTrack.lyrics),
                duration: Math.round(versionTrack.duration || versionTrack.duration_seconds || 0),
                metadata: versionMetadata,
              })
              .eq("id", existingVersion.id);

            if (versionError) {
              console.error(`[suno-callback] Error updating version ${i}:`, versionError);
            } else {
              console.log(`[suno-callback] Version ${i} updated successfully`);
            }
          } else {
            // Insert new version
            const { error: versionError } = await supabase
              .from("track_versions")
              .insert({
                parent_track_id: track.id,
                variant_index: i,
                is_preferred_variant: false,
                is_primary_variant: false,
                suno_id: sanitizeText(versionTrack.id),
                audio_url: versionAudioUrl,
                video_url: versionVideoUrl,
                cover_url: versionCoverUrl,
                lyrics: sanitizeText(versionTrack.prompt || versionTrack.lyric || versionTrack.lyrics),
                duration: Math.round(versionTrack.duration || versionTrack.duration_seconds || 0),
                metadata: versionMetadata,
              });

            if (versionError) {
              console.error(`[suno-callback] Error inserting version ${i}:`, versionError);
            } else {
              console.log(`[suno-callback] Version ${i} created successfully`);
            }
          }
        }
      }

      console.log("Suno callback: track completed", {
        taskId,
        trackId: track.id,
        versionsCount: successfulTracks.length,
      });

      return new Response(JSON.stringify({ ok: true, versionsCreated: successfulTracks.length }), {
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

serve(mainHandler);
