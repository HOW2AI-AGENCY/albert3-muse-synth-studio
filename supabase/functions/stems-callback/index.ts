import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import {
  determineSeparationMode,
  extractStatusMessage,
  extractStemAssetsFromPayload,
  getRecord,
  sanitizeStemText,
} from "../_shared/stems.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB

const mainHandler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.parse(bodyText);
    console.log("[stems-callback] payload", payload);

    const root = getRecord(payload);
    if (!root) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = getRecord(root.data);
    const stemTaskId = (() => {
      const candidate = data?.task_id ?? data?.taskId ?? root.task_id ?? root.taskId;
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
    })();

    if (!stemTaskId) {
      console.error("[stems-callback] missing task id", payload);
      return new Response(
        JSON.stringify({ error: "Missing task identifier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const code = typeof root.code === "number" ? root.code : undefined;
    const statusMessage = sanitizeStemText(extractStatusMessage(root), 500) || null;

    const supabase = createSupabaseAdminClient();

    const { data: trackRecord, error: trackError } = await supabase
      .from("tracks")
      .select("id, metadata, has_stems")
      .eq("metadata->>stem_task_id", stemTaskId)
      .maybeSingle();

    if (trackError || !trackRecord) {
      console.error("[stems-callback] track not found", { stemTaskId, trackError });
      throw trackError || new Error("Track not found for stem task");
    }

    const trackId = trackRecord.id;
    const trackMetadata = getRecord(trackRecord.metadata) ?? {};
    const currentMode = typeof trackMetadata.stem_separation_mode === "string"
      ? trackMetadata.stem_separation_mode
      : null;

    const { data: versionRecord } = await supabase
      .from("track_versions")
      .select("id, metadata")
      .eq("parent_track_id", trackId)
      .eq("metadata->>stem_task_id", stemTaskId)
      .maybeSingle();

    const versionId = versionRecord?.id ?? null;
    const versionMetadata = versionRecord ? getRecord(versionRecord.metadata) : null;

    const stemAssets = extractStemAssetsFromPayload(root);
    const separationMode = determineSeparationMode(currentMode, stemAssets.length);

    const isSuccess = (code === 200 || code === undefined) && stemAssets.length > 0;

    if (isSuccess) {
      const deleteQuery = supabase
        .from("track_stems")
        .delete()
        .eq("track_id", trackId)
        .eq("separation_mode", separationMode);

      if (versionId) {
        deleteQuery.eq("version_id", versionId);
      } else {
        deleteQuery.is("version_id", null);
      }
    }

    const derivedMode = stemAssets.length > 2 ? "split_stem" : "separate_vocal";
    const separationMode = currentMode ?? derivedMode;

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error("[stems-callback] failed to clean existing stems", { deleteError, trackId, stemTaskId });
      }

      if (stemAssets.length > 0) {
        const rows = stemAssets.map(({ stemType, audioUrl, sourceKey }) => ({
          track_id: trackId,
          version_id: versionId,
          stem_type: stemType,
          separation_mode: separationMode,
          audio_url: sanitizeStemText(audioUrl, 2048),
          suno_task_id: stemTaskId,
          metadata: { source_key: sourceKey },
        }));

        const { error: insertError } = await supabase
          .from("track_stems")
          .insert(rows);

        if (insertError) {
          console.error("[stems-callback] failed to insert stems", { insertError, trackId, stemTaskId });
        }
      }
    }

    const nowIso = new Date().toISOString();

    const updatedTrackMetadata = {
      ...trackMetadata,
      stem_task_id: stemTaskId,
      stem_version_id: versionId,
      stem_separation_mode: separationMode,
      stem_task_status: isSuccess ? "completed" : "failed",
      stem_task_completed_at: nowIso,
      stem_last_error: isSuccess ? null : statusMessage,
      stem_last_callback: root,
      stem_last_callback_code: code ?? null,
      stem_last_callback_message: statusMessage,
      stem_last_callback_received_at: nowIso,
      stem_assets_count: isSuccess ? stemAssets.length : trackMetadata["stem_assets_count"] ?? null,
    } as Record<string, unknown>;

    const trackUpdatePayload: Record<string, unknown> = {
      metadata: updatedTrackMetadata,
    };

    if (isSuccess) {
      trackUpdatePayload.has_stems = true;
    }

    const { error: trackUpdateError } = await supabase
      .from("tracks")
      .update(trackUpdatePayload)
      .eq("id", trackId);

    if (trackUpdateError) {
      console.error("[stems-callback] failed to update track metadata", { trackUpdateError, trackId });
    }

    if (versionId && versionMetadata) {
      const updatedVersionMetadata = {
        ...versionMetadata,
        stem_task_id: stemTaskId,
        stem_separation_mode: separationMode,
        stem_task_status: isSuccess ? "completed" : "failed",
        stem_task_completed_at: nowIso,
        stem_last_error: isSuccess ? null : statusMessage,
        stem_last_callback: root,
        stem_last_callback_code: code ?? null,
        stem_last_callback_message: statusMessage,
        stem_last_callback_received_at: nowIso,
        stem_assets_count: isSuccess ? stemAssets.length : versionMetadata["stem_assets_count"] ?? null,
      } as Record<string, unknown>;

      const { error: versionUpdateError } = await supabase
        .from("track_versions")
        .update({ metadata: updatedVersionMetadata })
        .eq("id", versionId);

      if (versionUpdateError) {
        console.error("[stems-callback] failed to update version metadata", { versionUpdateError, versionId });
      }
    }

    console.log("[stems-callback] processed", {
      trackId,
      versionId,
      stemTaskId,
      separationMode,
      assets: stemAssets.length,
      code,
    });

    return new Response(
      JSON.stringify({ success: true, processed: isSuccess }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[stems-callback] error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 50,
  windowMinutes: 1,
  endpoint: "stems-callback",
});

serve(handler);