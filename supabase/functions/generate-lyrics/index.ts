import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  withRateLimit,
  createSecurityHeaders,
} from "../_shared/security.ts";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import {
  validateRequest,
  validationSchemas,
  ValidationException,
} from "../_shared/validation.ts";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient,
  ensureSupabaseUrl,
} from "../_shared/supabase.ts";
import {
  createSunoClient,
  SunoApiError,
  SunoLyricsPayload,
} from "../_shared/suno.ts";

interface GenerateLyricsRequestBody {
  prompt: string;
  trackId?: string;
  metadata?: Record<string, unknown> | null;
}

interface GenerateLyricsResponseBody {
  success: boolean;
  jobId: string;
  taskId: string;
  status: string;
}

const normaliseCallbackUrl = (supabaseUrl: string | null): string | null => {
  const configured = Deno.env.get("SUNO_LYRICS_CALLBACK_URL")?.trim();
  if (configured) {
    return configured;
  }
  if (!supabaseUrl) {
    return null;
  }
  const base = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
  return `${base}/functions/v1/lyrics-callback`;
};

const updateJobFailure = async (
  supabaseAdmin: SupabaseClient | null,
  jobId: string | null,
  errorMessage: string,
) => {
  if (!supabaseAdmin || !jobId) {
    return;
  }
  await supabaseAdmin
    .from("lyrics_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
};

export const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(),
    ...createSecurityHeaders(),
  };

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  let supabaseAdmin: SupabaseClient | null = null;
  let jobId: string | null = null;

  try {
    const body = await validateRequest(
      req,
      validationSchemas.generateLyrics,
    ) as GenerateLyricsRequestBody;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createSupabaseUserClient(token);
    const { data: authData, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !authData?.user) {
      console.error("🔴 [GENERATE-LYRICS] Auth failed", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = authData.user;
    const { prompt, trackId, metadata } = body;

    console.log("🎵 [GENERATE-LYRICS] Request", {
      userId: user.id,
      promptLength: prompt?.length || 0,
      promptWords: prompt?.trim().split(/\s+/).length || 0,
      hasTrackId: !!trackId,
      metadata
    });

    // Check word limit (200 words max)
    const wordCount = prompt.trim().split(/\s+/).length;
    if (wordCount > 200) {
      console.warn("⚠️ [GENERATE-LYRICS] Prompt too long", { wordCount });
      return new Response(
        JSON.stringify({ error: `Prompt too long (${wordCount} words). Maximum is 200 words.` }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (trackId) {
      const { data: trackCheck, error: trackError } = await supabaseUser
        .from("tracks")
        .select("id")
        .eq("id", trackId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (trackError || !trackCheck) {
        console.error("🔴 [GENERATE-LYRICS] Track not found or unauthorized", {
          trackId,
          error: trackError,
        });
        return new Response(
          JSON.stringify({ error: "Track not found or unauthorized" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const supabaseUrl = ensureSupabaseUrl();
    const callbackUrl = normaliseCallbackUrl(supabaseUrl);

    if (!callbackUrl) {
      throw new Error("Lyrics callback URL is not configured");
    }

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY not configured");
    }

    supabaseAdmin = createSupabaseAdminClient();

    console.log("📝 [GENERATE-LYRICS] Creating lyrics job in DB");

    const insertPayload = {
      user_id: user.id,
      track_id: trackId ?? null,
      prompt,
      status: "pending",
      call_strategy: "callback",
      callback_url: callbackUrl,
      metadata: metadata ?? null,
      request_payload: { prompt },
    };

    const { data: job, error: jobError } = await supabaseAdmin
      .from("lyrics_jobs")
      .insert(insertPayload)
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("🔴 [GENERATE-LYRICS] Failed to create job", jobError);
      throw new Error("Failed to create lyrics job");
    }

    jobId = job.id;

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });

    console.log("🚀 [GENERATE-LYRICS] Calling Suno API", {
      endpoint: 'https://api.sunoapi.org/api/v1/lyrics',
      promptLength: prompt.length,
      callbackUrl
    });

    const sunoPayload: SunoLyricsPayload = {
      prompt,
      callBackUrl: callbackUrl,
    };

    const { taskId, rawResponse } = await sunoClient.generateLyrics(sunoPayload);

    console.log("✅ [GENERATE-LYRICS] Suno API success", {
      taskId,
      jobId: job.id
    });

    await supabaseAdmin
      .from("lyrics_jobs")
      .update({
        status: "processing",
        suno_task_id: taskId,
        request_payload: sunoPayload,
        initial_response: rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const responseBody: GenerateLyricsResponseBody = {
      success: true,
      jobId: job.id,
      taskId,
      status: "processing",
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🔴 [GENERATE-LYRICS] Error", error);

    if (error instanceof ValidationException) {
      return new Response(JSON.stringify({
        error: "Validation failed",
        details: error.errors,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = error instanceof SunoApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Internal server error";

    await updateJobFailure(supabaseAdmin, jobId, message);

    const status = error instanceof SunoApiError ? 502 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 20,
  windowMinutes: 1,
  endpoint: "generate-lyrics",
});

serve(handler);
