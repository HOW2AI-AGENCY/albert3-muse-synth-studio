import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createCorsHeaders,
} from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";

interface LyricsCallbackVariant {
  id?: string;
  text?: string;
  title?: string;
  status?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

interface LyricsCallbackBody {
  code?: number;
  msg?: string;
  data?: {
    callbackType?: string;
    taskId?: string;
    task_id?: string;
    data?: LyricsCallbackVariant[] | null;
  } | null;
  [key: string]: unknown;
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

export const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(),
    ...createSecurityHeaders(),
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // ✅ Webhook signature verification
    const signature = req.headers.get('X-Suno-Signature');
    const SUNO_WEBHOOK_SECRET = Deno.env.get('SUNO_WEBHOOK_SECRET');
    
    let payload: LyricsCallbackBody;
    
    if (SUNO_WEBHOOK_SECRET) {
      if (!signature) {
        console.error('🔴 [LYRICS-CALLBACK] Missing webhook signature');
        return new Response(JSON.stringify({ error: 'missing_signature' }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      
      const bodyText = await req.text();
      const { verifyWebhookSignature } = await import('../_shared/webhook-verify.ts');
      const isValid = await verifyWebhookSignature(bodyText, signature, SUNO_WEBHOOK_SECRET);
      
      if (!isValid) {
        console.error('🔴 [LYRICS-CALLBACK] Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'invalid_signature' }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      
      payload = JSON.parse(bodyText) as LyricsCallbackBody;
    } else {
      console.warn('⚠️ [LYRICS-CALLBACK] SUNO_WEBHOOK_SECRET not configured - skipping signature verification');
      payload = await req.json() as LyricsCallbackBody;
    }
    const code = typeof payload.code === "number" ? payload.code : undefined;
    const message = typeof payload.msg === "string" ? payload.msg : undefined;
    const callbackData = payload.data ?? undefined;
    const callbackType = typeof callbackData?.callbackType === "string"
      ? callbackData.callbackType
      : undefined;
    const taskId = typeof callbackData?.taskId === "string"
      ? callbackData.taskId
      : typeof callbackData?.task_id === "string"
        ? callbackData.task_id
        : undefined;

    if (!taskId) {
      console.error("🔴 [LYRICS-CALLBACK] Missing taskId in callback", payload);
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseAdminClient();

    const { data: job, error: jobError } = await supabase
      .from("lyrics_jobs")
      .select("id, user_id, prompt")
      .eq("suno_task_id", taskId)
      .maybeSingle();

    if (jobError) {
      console.error("🔴 [LYRICS-CALLBACK] Failed to load job", {
        taskId,
        error: jobError,
      });
      return new Response(JSON.stringify({ status: "error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!job) {
      console.warn("⚠️ [LYRICS-CALLBACK] No job found for task", { taskId });
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variants = Array.isArray(callbackData?.data)
      ? callbackData?.data as LyricsCallbackVariant[]
      : [];

    const completeVariants = variants.filter((variant) => {
      const status = normaliseStatus(variant.status);
      return status === "complete";
    });

    // Helper to determine error message from callback
    const determineErrorMessage = (code: number | undefined, msg: string | undefined): string => {
      if (code === 413) {
        return "Prompt too long. Please shorten your lyrics description (max 200 words).";
      }
      if (code === 429) {
        return "Insufficient credits. Please top up your Suno account.";
      }
      if (code === 430) {
        return "Rate limit exceeded. Please try again later.";
      }
      if (code === 455) {
        return "Suno system maintenance. Please try again later.";
      }
      if (code === 451) {
        return "Failed to process lyrics. File download error.";
      }
      return msg || "Lyrics generation failed";
    };

    const now = new Date().toISOString();

    if (variants.length > 0) {
      const upsertPayload = variants.map((variant, index) => ({
        job_id: job.id,
        variant_index: index,
        title: typeof variant.title === "string" ? variant.title : null,
        status: normaliseStatus(variant.status),
        content: sanitizeText(variant.text ?? variant.lyrics ?? variant.prompt),
        error_message: typeof variant.errorMessage === "string"
          ? variant.errorMessage
          : null,
        updated_at: now,
      }));

      if (upsertPayload.length > 0) {
        const { error: upsertError } = await supabase
          .from("lyrics_variants")
          .upsert(upsertPayload, { onConflict: "job_id,variant_index" });

        if (upsertError) {
          console.error("🔴 [LYRICS-CALLBACK] Failed to upsert variants", {
            jobId: job.id,
            error: upsertError,
          });
        }
      }
    }

    const success = code === 200 && callbackType !== "error" && completeVariants.length > 0;
    const errorMessage = success ? null : determineErrorMessage(code, message);

    const { error: updateError } = await supabase
      .from("lyrics_jobs")
      .update({
        status: success ? "completed" : "failed",
        error_message: errorMessage,
        last_callback: payload,
        updated_at: now,
      })
      .eq("id", job.id);

    if (updateError) {
      console.error("🔴 [LYRICS-CALLBACK] Failed to update job", {
        jobId: job.id,
        error: updateError,
      });
    }

    // ✅ NEW: Логирование в lyrics_generation_log
    if (job.user_id && job.prompt) {
      try {
        const firstCompleteVariant = completeVariants[0];
        const logEntry = {
          user_id: job.user_id,
          prompt: job.prompt,
          generated_lyrics: success && firstCompleteVariant?.text 
            ? sanitizeText(firstCompleteVariant.text) 
            : null,
          generated_title: success && firstCompleteVariant?.title 
            ? sanitizeText(firstCompleteVariant.title) 
            : null,
          status: success ? 'completed' : 'failed',
          error_message: errorMessage,
          metadata: {
            suno_task_id: taskId,
            job_id: job.id,
            variants_count: variants.length,
            callback_code: code,
          },
        };

        const { error: logError } = await supabase
          .from('lyrics_generation_log')
          .insert(logEntry);

        if (logError) {
          console.error('⚠️ [LYRICS-CALLBACK] Failed to log to lyrics_generation_log', {
            jobId: job.id,
            error: logError,
          });
        } else {
          console.log('✅ [LYRICS-CALLBACK] Logged to lyrics_generation_log', {
            jobId: job.id,
            status: success ? 'completed' : 'failed',
          });
        }
      } catch (logError) {
        console.error('⚠️ [LYRICS-CALLBACK] Error logging to lyrics_generation_log', logError);
      }
    }

    return new Response(JSON.stringify({ status: "received" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🔴 [LYRICS-CALLBACK] Error handling callback", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(mainHandler);
