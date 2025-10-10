import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSecurityHeaders, withRateLimit } from "../_shared/security.ts";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient,
  ensureSupabaseUrl,
} from "../_shared/supabase.ts";
import {
  validateRequest,
  validationSchemas,
  ValidationException,
} from "../_shared/validation.ts";
import { createSunoClient, SunoApiError } from "../_shared/suno.ts";
import {
  determineSeparationMode,
  extractStatusMessage,
  getRecord,
  NormalizedStemAsset,
  resolveStemType,
  sanitizeStemText,
} from "../_shared/stems.ts";

interface SyncStemJobRequestBody {
  trackId: string;
  versionId?: string;
  taskId?: string;
  separationMode?: string;
  forceRefresh?: boolean;
}

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

const normaliseStatus = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  return value.toLowerCase();
};

const failureStatuses = new Set([
  "create_task_failed",
  "generate_audio_failed",
  "callback_exception",
  "sensitive_word_error",
]);

const mapSunoAssets = (assets: { sourceKey?: string; url: string }[]): NormalizedStemAsset[] => {
  const mapped: NormalizedStemAsset[] = [];
  for (const asset of assets) {
    const sourceKey = asset.sourceKey ?? "";
    const stemType = resolveStemType(sourceKey);
    if (!stemType) continue;
    if (typeof asset.url !== "string") continue;
    const trimmed = asset.url.trim();
    if (!trimmed) continue;
    mapped.push({ stemType, audioUrl: trimmed, sourceKey });
  }
  return mapped;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    ensureSupabaseUrl();

    const body = await validateRequest(req, validationSchemas.syncStemJob) as SyncStemJobRequestBody;
    const { trackId, versionId, taskId: overrideTaskId, separationMode: requestedMode } = body;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUserClient = createSupabaseUserClient(token);
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: trackRecord, error: trackError } = await supabaseAdmin
      .from("tracks")
      .select("id, user_id, metadata, has_stems")
      .eq("id", trackId)
      .maybeSingle();

    if (trackError || !trackRecord) {
      throw trackError || new Error("Track not found");
    }

    if (trackRecord.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trackMetadata = getRecord(trackRecord.metadata) ?? {};

    let targetTaskId = typeof overrideTaskId === "string" && overrideTaskId.trim()
      ? overrideTaskId.trim()
      : typeof trackMetadata.stem_task_id === "string" && trackMetadata.stem_task_id.trim()
        ? (trackMetadata.stem_task_id as string).trim()
        : null;

    let storedMode = typeof trackMetadata.stem_separation_mode === "string"
      ? trackMetadata.stem_separation_mode
      : null;

    let versionMetadata: Record<string, unknown> | null = null;

    if (versionId) {
      const { data: versionRecord, error: versionError } = await supabaseAdmin
        .from("track_versions")
        .select("id, parent_track_id, metadata")
        .eq("id", versionId)
        .maybeSingle();

      if (versionError || !versionRecord) {
        throw versionError || new Error("Version not found");
      }

      if (versionRecord.parent_track_id !== trackId) {
        throw new ValidationException([
          { field: "versionId", message: "Версия не принадлежит указанному треку" },
        ]);
      }

      versionMetadata = getRecord(versionRecord.metadata);

      if (!targetTaskId) {
        const versionTaskId = versionMetadata?.stem_task_id;
        if (typeof versionTaskId === "string" && versionTaskId.trim()) {
          targetTaskId = versionTaskId.trim();
        }
      }

      if (!storedMode && typeof versionMetadata?.stem_separation_mode === "string") {
        storedMode = versionMetadata.stem_separation_mode;
      }
    }

    if (!targetTaskId) {
      throw new ValidationException([
        { field: "taskId", message: "Не удалось определить идентификатор задачи Suno" },
      ]);
    }

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
    const queryResult = await sunoClient.queryStemTask(targetTaskId);

    const remoteAssets = Array.isArray(queryResult.assets) ? queryResult.assets : [];
    const stemAssets = mapSunoAssets(remoteAssets);

    const remoteStatus = normaliseStatus(queryResult.status);
    const code = queryResult.code;
    const rawPayload = queryResult.rawResponse && typeof queryResult.rawResponse === "object"
      ? queryResult.rawResponse as Record<string, unknown>
      : {};
    const statusMessage = sanitizeStemText(
      extractStatusMessage(rawPayload),
      500,
    ) || null;

    const separationMode = determineSeparationMode(requestedMode ?? storedMode ?? null, stemAssets.length);
    const nowIso = new Date().toISOString();

    const isSuccess = stemAssets.length > 0 && (code === 200 || code === undefined || code === null);
    const isFailure = Boolean(
      (code && code !== 200) ||
      (remoteStatus && failureStatuses.has(remoteStatus)),
    );

    if (isSuccess) {
      const deleteQuery = supabaseAdmin
        .from("track_stems")
        .delete()
        .eq("track_id", trackId)
        .eq("separation_mode", separationMode);

      if (versionId) {
        deleteQuery.eq("version_id", versionId);
      } else {
        deleteQuery.is("version_id", null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error("[sync-stem-job] failed to remove previous stems", { deleteError, trackId, separationMode });
      }

      if (stemAssets.length > 0) {
        const rows = stemAssets.map(asset => ({
          track_id: trackId,
          version_id: versionId ?? null,
          stem_type: asset.stemType,
          separation_mode: separationMode,
          audio_url: sanitizeStemText(asset.audioUrl, 2048),
          suno_task_id: targetTaskId,
          metadata: { source_key: asset.sourceKey },
        }));

        const { error: insertError } = await supabaseAdmin
          .from("track_stems")
          .insert(rows);

        if (insertError) {
          console.error("[sync-stem-job] failed to insert stem assets", { insertError, trackId, separationMode });
        }
      }
    }

    const nextStatus = isSuccess
      ? "completed"
      : isFailure
        ? "failed"
        : typeof trackMetadata.stem_task_status === "string"
          ? trackMetadata.stem_task_status
          : "processing";

    const updatedTrackMetadata = {
      ...trackMetadata,
      stem_task_id: targetTaskId,
      stem_version_id: versionId ?? null,
      stem_separation_mode: separationMode,
      stem_task_status: nextStatus,
      stem_task_completed_at: isSuccess ? nowIso : trackMetadata.stem_task_completed_at ?? null,
      stem_last_error: isSuccess ? null : statusMessage ?? trackMetadata.stem_last_error ?? null,
      stem_last_poll_endpoint: queryResult.endpoint,
      stem_last_poll_code: code ?? null,
      stem_last_poll_message: statusMessage,
      stem_last_poll_response: queryResult.rawResponse,
      stem_last_polled_at: nowIso,
      stem_assets_count: isSuccess ? stemAssets.length : trackMetadata.stem_assets_count ?? null,
    } as Record<string, unknown>;

    const trackUpdatePayload: Record<string, unknown> = {
      metadata: updatedTrackMetadata,
    };

    if (isSuccess) {
      trackUpdatePayload.has_stems = true;
    }

    const { error: trackUpdateError } = await supabaseAdmin
      .from("tracks")
      .update(trackUpdatePayload)
      .eq("id", trackId);

    if (trackUpdateError) {
      console.error("[sync-stem-job] failed to update track metadata", { trackUpdateError, trackId });
    }

    if (versionId && versionMetadata) {
      const updatedVersionMetadata = {
        ...versionMetadata,
        stem_task_id: targetTaskId,
        stem_separation_mode: separationMode,
        stem_task_status: nextStatus,
        stem_task_completed_at: isSuccess ? nowIso : versionMetadata.stem_task_completed_at ?? null,
        stem_last_error: isSuccess ? null : statusMessage ?? versionMetadata.stem_last_error ?? null,
        stem_last_poll_endpoint: queryResult.endpoint,
        stem_last_poll_code: code ?? null,
        stem_last_poll_message: statusMessage,
        stem_last_poll_response: queryResult.rawResponse,
        stem_last_polled_at: nowIso,
        stem_assets_count: isSuccess ? stemAssets.length : versionMetadata.stem_assets_count ?? null,
      } as Record<string, unknown>;

      const { error: versionUpdateError } = await supabaseAdmin
        .from("track_versions")
        .update({ metadata: updatedVersionMetadata })
        .eq("id", versionId);

      if (versionUpdateError) {
        console.error("[sync-stem-job] failed to update version metadata", { versionUpdateError, versionId });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trackId,
        versionId: versionId ?? null,
        taskId: targetTaskId,
        separationMode,
        assets: stemAssets.length,
        status: nextStatus,
        code: code ?? null,
        message: statusMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[sync-stem-job] error", error);

    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (error instanceof SunoApiError) {
      const status = error.details.status ?? 500;
      return new Response(
        JSON.stringify({
          error: status === 429
            ? "Suno API rate limit reached. Please retry later."
            : error.message,
          details: {
            endpoint: error.details.endpoint,
            status: error.details.status ?? null,
            body: error.details.body ?? null,
          },
        }),
        {
          status: status === 0 ? 502 : status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

const rateLimitedHandler = withRateLimit(handler, {
  maxRequests: 15,
  windowMinutes: 1,
  endpoint: "sync-stem-job",
});

serve(rateLimitedHandler);
