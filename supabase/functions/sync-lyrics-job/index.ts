import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { createSecurityHeaders, withRateLimit } from "../_shared/security.ts";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient,
} from "../_shared/supabase.ts";
import {
  validateRequest,
  validationSchemas,
  ValidationException,
} from "../_shared/validation.ts";
import {
  createSunoClient,
  SunoApiError,
  SunoLyricsVariantStatus,
} from "../_shared/suno.ts";

interface SyncLyricsJobRequestBody {
  jobId: string;
  forceRefresh?: boolean;
}

const sanitizeText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
};

const normaliseStatus = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  return value.toLowerCase();
};

const extractMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  if (typeof root.msg === "string") {
    return root.msg;
  }
  if (typeof root.message === "string") {
    return root.message;
  }

  const data = root.data;
  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;
    if (typeof dataObj.msg === "string") {
      return dataObj.msg;
    }
    if (typeof dataObj.message === "string") {
      return dataObj.message;
    }
    if (typeof dataObj.errorMessage === "string") {
      return dataObj.errorMessage;
    }
    const response = dataObj.response;
    if (response && typeof response === "object") {
      const responseObj = response as Record<string, unknown>;
      if (typeof responseObj.msg === "string") {
        return responseObj.msg;
      }
      if (typeof responseObj.message === "string") {
        return responseObj.message;
      }
    }
  }

  return null;
};

const fetchJobWithVariants = async (
  supabase: SupabaseClient,
  jobId: string,
) => {
  return await supabase
    .from("lyrics_jobs")
    .select(`
      id,
      user_id,
      track_id,
      prompt,
      status,
      suno_task_id,
      call_strategy,
      callback_url,
      metadata,
      request_payload,
      initial_response,
      last_callback,
      last_poll_response,
      error_message,
      created_at,
      updated_at,
      variants:lyrics_variants (
        id,
        job_id,
        variant_index,
        title,
        status,
        content,
        error_message,
        created_at,
        updated_at
      )
    `)
    .eq("id", jobId)
    .maybeSingle();
};

const upsertVariants = async (
  supabase: SupabaseClient,
  jobId: string,
  variants: SunoLyricsVariantStatus[],
) => {
  const now = new Date().toISOString();
  const payload = variants.map((variant, index) => ({
    job_id: jobId,
    variant_index: index,
    title: typeof variant.title === "string" ? variant.title : null,
    status: normaliseStatus(variant.status),
    content: sanitizeText(variant.text),
    error_message: typeof variant.errorMessage === "string"
      ? variant.errorMessage
      : null,
    updated_at: now,
  }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("lyrics_variants")
    .upsert(payload, { onConflict: "job_id,variant_index" });

  if (error) {
    console.error("🔴 [SYNC-LYRICS-JOB] Failed to upsert variants", {
      jobId,
      error,
    });
  }
};

const determineJobStatus = (
  code: number | undefined,
  status: string | null,
  variants: SunoLyricsVariantStatus[],
  fallbackMessage: string | null,
) => {
  const normalisedStatus = status ?? null;
  const completeVariant = variants.some((variant) => {
    const variantStatus = normaliseStatus(variant.status);
    return variantStatus === "complete" && Boolean(sanitizeText(variant.text));
  });

  const isSuccessStatus = normalisedStatus === "success";

  if ((code === 200 || code === undefined) && (isSuccessStatus || completeVariant)) {
    return { status: "completed" as const, errorMessage: null as string | null };
  }

  const failureStatuses = new Set([
    "create_task_failed",
    "generate_lyrics_failed",
    "callback_exception",
    "sensitive_word_error",
  ]);

  if ((code && code !== 200) || (normalisedStatus && failureStatuses.has(normalisedStatus))) {
    return {
      status: "failed" as const,
      errorMessage: fallbackMessage || normalisedStatus || "Lyrics generation failed",
    };
  }

  return { status: "processing" as const, errorMessage: null as string | null };
};

export const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(),
    ...createSecurityHeaders(),
  };

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await validateRequest(
      req,
      validationSchemas.syncLyricsJob,
    ) as SyncLyricsJobRequestBody;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createSupabaseUserClient(token);
    const { data: authData, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !authData?.user) {
      console.error("🔴 [SYNC-LYRICS-JOB] Auth failed", authError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, forceRefresh = false } = body;

    const { data: jobRecord, error: jobError } = await supabaseUser
      .from("lyrics_jobs")
      .select("id, status, suno_task_id, call_strategy, error_message")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      console.error("🔴 [SYNC-LYRICS-JOB] Failed to load job", jobError);
      return new Response(JSON.stringify({ success: false, error: "Failed to load job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobRecord) {
      return new Response(JSON.stringify({ success: false, error: "Lyrics job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    if (!forceRefresh && (jobRecord.status === "completed" || jobRecord.status === "failed")) {
      const { data: latestJob, error: latestError } = await fetchJobWithVariants(supabaseAdmin, jobId);
      if (latestError) {
        console.error("🔴 [SYNC-LYRICS-JOB] Failed to fetch latest job", latestError);
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch job" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, job: latestJob ?? null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobRecord.suno_task_id) {
      const { data: latestJob, error: latestError } = await fetchJobWithVariants(supabaseAdmin, jobId);
      if (latestError) {
        console.error("🔴 [SYNC-LYRICS-JOB] Failed to fetch job without task id", latestError);
      }

      return new Response(JSON.stringify({ success: false, error: "Missing Suno task identifier", job: latestJob ?? null }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY not configured");
    }

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
    const result = await sunoClient.queryLyricsTask(jobRecord.suno_task_id);

    await upsertVariants(supabaseAdmin, jobId, result.data ?? []);

    const fallbackMessage = extractMessage(result.rawResponse);
    const { status, errorMessage } = determineJobStatus(
      result.code,
      normaliseStatus(result.status),
      result.data ?? [],
      fallbackMessage,
    );

    const nextErrorMessage = status === "processing"
      ? jobRecord.error_message
      : errorMessage;

    let safeRawResponse: unknown = null;
    if (result.rawResponse != null) {
      try {
        safeRawResponse = JSON.parse(JSON.stringify(result.rawResponse));
      } catch (serializationError) {
        console.error("⚠️ [SYNC-LYRICS-JOB] Failed to serialise Suno response", serializationError);
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("lyrics_jobs")
      .update({
        status,
        error_message: nextErrorMessage,
        last_poll_response: safeRawResponse,
        call_strategy: jobRecord.call_strategy === "callback"
          ? "callback_poll_fallback"
          : jobRecord.call_strategy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("🔴 [SYNC-LYRICS-JOB] Failed to update job", updateError);
    }

    const { data: refreshedJob, error: refreshedError } = await fetchJobWithVariants(supabaseAdmin, jobId);
    if (refreshedError) {
      console.error("🔴 [SYNC-LYRICS-JOB] Failed to load refreshed job", refreshedError);
      return new Response(JSON.stringify({ success: false, error: "Failed to load refreshed job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, job: refreshedJob ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🔴 [SYNC-LYRICS-JOB] Error", error);

    if (error instanceof ValidationException) {
      return new Response(JSON.stringify({ success: false, error: "Validation failed", details: error.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (error instanceof SunoApiError) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

const handler = withRateLimit(mainHandler, {
  endpoint: "sync-lyrics-job",
  maxRequests: 40,
  windowMinutes: 1,
});

serve(handler);
