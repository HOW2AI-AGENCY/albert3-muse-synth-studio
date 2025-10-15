import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { logger, withSentry } from "../_shared/logger.ts";
import { createSunoClient, SunoApiError } from "../_shared/suno.ts";
import { createMurekaStemClient, MurekaApiError } from "../_shared/mureka-stem.ts";
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

interface SeparateStemsRequestBody {
  trackId: string;
  versionId?: string;
  separationMode: string;
}

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

const SUPPORTED_SEPARATION_MODES = new Set(["separate_vocal", "split_stem"]);

const getMetadataObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const mainHandler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    const response = handleCorsPreflightRequest(req);
    return new Response(null, { status: response.status, headers: corsHeaders });
  }

  try {
    console.log('🟢 [STEMS] Handler entry', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get('Authorization'),
      timestamp: new Date().toISOString()
    });

    // ✅ ИСПРАВЛЕНИЕ: Используем JWT аутентификацию
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('🔴 [STEMS] handler-401: Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createSupabaseUserClient(token);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      console.error('🔴 [STEMS] handler-401: Invalid token', { authError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`[separate-stems] 🎵 Handler entry: userId=${userId.substring(0, 8)}..., method=${req.method}`);

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    const SUPABASE_URL = ensureSupabaseUrl();
    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });

    const body = await validateRequest(req, validationSchemas.separateStems) as SeparateStemsRequestBody;
    const { trackId, versionId, separationMode } = body;
    
    console.log(`[separate-stems] 📋 Request details: trackId=${trackId}, versionId=${versionId || 'null'}, mode=${separationMode}`);

    if (!SUPPORTED_SEPARATION_MODES.has(separationMode)) {
      throw new ValidationException([
        {
          field: "separationMode",
          message: "Недопустимый режим разделения стемов",
        },
      ]);
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: trackRecord, error: trackError } = await supabaseAdmin
      .from("tracks")
      .select("id, user_id, suno_id, audio_url, metadata, has_stems, provider")
      .eq("id", trackId)
      .maybeSingle();

    if (trackError || !trackRecord) {
      throw new Error("Track not found");
    }

    if (trackRecord.user_id !== userId) {
      console.error(`[separate-stems] ❌ handler-403: User ${userId.substring(0, 8)}... does not own track ${trackId}`);
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trackProvider = trackRecord.provider || 'suno';
    const trackMetadata = getMetadataObject(trackRecord.metadata);
    const trackTaskId = trackMetadata["suno_task_id"];
    let taskId = typeof trackTaskId === "string" && trackTaskId.trim() ? trackTaskId.trim() : null;
    let audioId = typeof trackRecord.suno_id === "string" && trackRecord.suno_id.trim()
      ? trackRecord.suno_id.trim()
      : null;
    let versionMetadata: Record<string, unknown> | null = null;

    if (versionId) {
      const { data: versionRecord, error: versionError } = await supabaseAdmin
        .from("track_versions")
        .select("id, parent_track_id, suno_id, metadata")
        .eq("id", versionId)
        .maybeSingle();

      if (versionError || !versionRecord) {
        throw new Error("Version not found");
      }

      if (versionRecord.parent_track_id !== trackId) {
        throw new ValidationException([
          {
            field: "versionId",
            message: "Версия не принадлежит указанному треку",
          },
        ]);
      }

      versionMetadata = getMetadataObject(versionRecord.metadata);
      if (typeof versionRecord.suno_id === "string" && versionRecord.suno_id.trim()) {
        audioId = versionRecord.suno_id.trim();
      }

      if (!taskId) {
        const versionTaskId = versionMetadata?.["suno_task_id"];
        if (typeof versionTaskId === "string" && versionTaskId.trim()) {
          taskId = versionTaskId.trim();
        }
      }
    }

    if (!taskId) {
      throw new Error("Missing Suno task identifier for track");
    }

    if (!audioId) {
      throw new Error("Missing Suno audio identifier for track or version");
    }

    console.log("[separate-stems] 🎵 Request details", {
      trackId,
      versionId: versionId ?? null,
      audioId,
      taskId,
      separationMode,
      provider: trackProvider,
      timestamp: new Date().toISOString()
    });

    // ✅ Route to appropriate provider
    let stemTaskId: string;
    let stemEndpoint: string;

    if (trackProvider === 'mureka') {
      // === MUREKA STEM SEPARATION ===
      const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
      if (!MUREKA_API_KEY) {
        throw new Error('MUREKA_API_KEY not configured');
      }

      const murekaClient = createMurekaStemClient({ apiKey: MUREKA_API_KEY });

      if (!trackRecord.audio_url) {
        throw new Error('Track audio_url required for Mureka stem separation');
      }

      logger.info('[MUREKA-STEM] Initiating stem separation', { 
        trackId, 
        audioUrl: trackRecord.audio_url.substring(0, 100) 
      });

      const murekaResult = await murekaClient.requestStemSeparation({
        audio_file: trackRecord.audio_url,
      });

      stemTaskId = murekaResult.taskId;
      stemEndpoint = murekaResult.endpoint;

      logger.info('[MUREKA-STEM] Task created', { stemTaskId, trackId });

    } else {
      // === SUNO STEM SEPARATION ===
      if (!taskId) {
        throw new Error("Missing Suno task identifier for track");
      }
      if (!audioId) {
        throw new Error("Missing Suno audio identifier for track or version");
      }

      const stemResult = await sunoClient.requestStemSeparation({
        taskId,
        audioId,
        type: (separationMode === 'split_stem' || separationMode === 'separate_vocal') ? separationMode : 'separate_vocal',
        callBackUrl: `${SUPABASE_URL}/functions/v1/stems-callback`,
      });

      stemTaskId = stemResult.taskId;
      stemEndpoint = stemResult.endpoint;

      logger.info('[SUNO-STEM] Task created', { stemTaskId, trackId });
    }
    const nowIso = new Date().toISOString();

    const updatedTrackMetadata = {
      ...trackMetadata,
      stem_task_id: stemTaskId,
      stem_provider: trackProvider,
      stem_version_id: versionId ?? null,
      stem_audio_id: audioId,
      stem_separation_mode: separationMode,
      stem_task_status: "processing",
      stem_task_started_at: nowIso,
      stem_task_completed_at: null,
      stem_last_error: null,
      stem_last_callback: null,
      stem_last_callback_code: null,
      stem_last_callback_message: null,
      stem_last_callback_received_at: null,
      stem_assets_count: trackMetadata["stem_assets_count"] ?? null,
      ...(trackProvider === 'suno' && { 
        suno_last_stem_endpoint: stemEndpoint,
      }),
      ...(trackProvider === 'mureka' && { 
        mureka_stem_task_id: stemTaskId 
      }),
    } as Record<string, unknown>;

    const { error: trackUpdateError } = await supabaseAdmin
      .from("tracks")
      .update({ metadata: updatedTrackMetadata })
      .eq("id", trackId);

    if (trackUpdateError) {
      throw trackUpdateError;
    }

    if (versionId && versionMetadata) {
      const updatedVersionMetadata = {
        ...versionMetadata,
        stem_task_id: stemTaskId,
        stem_audio_id: audioId,
        stem_separation_mode: separationMode,
        stem_task_status: "processing",
        stem_task_started_at: nowIso,
        stem_task_completed_at: null,
        stem_last_error: null,
        stem_last_callback: null,
        stem_last_callback_code: null,
        stem_last_callback_message: null,
        stem_last_callback_received_at: null,
        stem_assets_count: versionMetadata["stem_assets_count"] ?? null,
      } as Record<string, unknown>;

      const { error: versionUpdateError } = await supabaseAdmin
        .from("track_versions")
        .update({ metadata: updatedVersionMetadata })
        .eq("id", versionId);

      if (versionUpdateError) {
        throw versionUpdateError;
      }
    }

    console.log("[separate-stems] ✨ Request submitted", {
      trackId,
      versionId: versionId ?? null,
      separationMode,
      stemTaskId,
      provider: trackProvider,
      endpoint: stemEndpoint,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        taskId: stemTaskId,
        separationMode,
        provider: trackProvider,
        audioId,
        endpoint: stemEndpoint,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    logger.error("[separate-stems] error", { error: error instanceof Error ? error : new Error(String(error)) });

    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (error instanceof SunoApiError || error instanceof MurekaApiError) {
      const status = error.details.status ?? 500;
      return new Response(
        JSON.stringify({
          error: status === 429
            ? "API rate limit reached. Please retry later."
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

const rateLimitedHandler = withRateLimit(mainHandler, {
  maxRequests: 10,
  windowMinutes: 1,
  endpoint: "separate-stems",
});

const handler = withSentry(rateLimitedHandler, { transaction: "separate-stems" });

serve(handler);