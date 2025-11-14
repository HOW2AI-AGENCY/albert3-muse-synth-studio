/**
 * @version 2.1.0
 * @since 2025-11-11
 * @changelog 2.1.0 - Fixed authentication to use JWT token instead of X-User-Id header
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";

const requestSchema = z.object({
  taskId: z.string().min(1, { message: "taskId is required." }),
  audioId: z.string().min(1, { message: "audioId is required." }),
});

export async function handler(req: Request) {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ FIX: Extract user ID from JWT token instead of expecting X-User-Id header
    // Previous implementation expected X-User-Id header which was never set by the frontend
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error("[GET-TIMESTAMPED-LYRICS] Authentication failed", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("[GET-TIMESTAMPED-LYRICS] User authenticated", { userId: user.id });

    if (!SUNO_API_KEY) {
      throw new Error("Suno API credentials are not configured");
    }

    const rawBody = await req.json();
    const validation = requestSchema.safeParse(rawBody);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { taskId, audioId } = validation.data;

    const sunoPayload = { taskId, audioId };

    const sunoResponse = await fetch(
      `${SUNO_API_BASE_URL}/api/v1/generate/get-timestamped-lyrics`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUNO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sunoPayload),
      },
    );

    const responseData = await sunoResponse.json();

    return new Response(JSON.stringify(responseData), {
      status: sunoResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(
      "[GET-TIMESTAMPED-LYRICS] Unexpected error",
      error as Error,
    );
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

if (import.meta.main) {
  serve(handler);
}
