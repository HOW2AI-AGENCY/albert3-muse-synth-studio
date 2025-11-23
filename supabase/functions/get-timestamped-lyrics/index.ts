import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createAuthenticatedHandler } from "../_shared/handler-factory.ts";
import { logger } from "../_shared/logger.ts";
import type { SunoResponse, TimestampedLyricsData } from "../_shared/types/lyrics.ts";
import { timestampedLyricsSchema, sunoResponseSchema } from "../_shared/zod-schemas.ts";

const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
const SUNO_API_BASE_URL = Deno.env.get("SUNO_API_BASE_URL") || "https://api.sunoapi.org";

const requestSchema = z.object({
  taskId: z.string().min(1, { message: "taskId is required." }),
  audioId: z.string().min(1, { message: "audioId is required." }),
});

type GetTimestampedLyricsParams = z.infer<typeof requestSchema>;

function normalizeSunoResponse(response: SunoResponse): TimestampedLyricsData | null {
  try {
    if ('error' in response && response.error) {
      logger.warn("Suno API returned error", { error: response.error });
      return null;
    }
    if ('code' in response && 'data' in response) {
      if (response.code === 200 && response.data) {
        return response.data as TimestampedLyricsData;
      }
      logger.warn("Suno API returned non-200 code or null data", {
        code: response.code,
        hasData: !!response.data
      });
      return null;
    }
    if ('success' in response && 'data' in response) {
      if (response.success && response.data) {
        return response.data as TimestampedLyricsData;
      }
      logger.warn("Suno API returned success=false or null data", {
        success: response.success,
        hasData: !!response.data
      });
      return null;
    }
    if ('alignedWords' in response) {
      return response as TimestampedLyricsData;
    }
    logger.warn("Suno API response format not recognized", {
      keys: Object.keys(response)
    });
    return null;
  } catch (error) {
    logger.error("Error normalizing Suno response", {
      error: error
    });
    return null;
  }
}

createAuthenticatedHandler<GetTimestampedLyricsParams>({
  schema: requestSchema,
  rateLimit: 'default',
  handler: async (body, user) => {
    if (!SUNO_API_KEY) {
      throw new Error("Suno API credentials are not configured");
    }

    const { taskId, audioId } = body;
    const sunoPayload = { taskId, audioId };
    logger.info("[GET-TIMESTAMPED-LYRICS] Calling Suno API", { taskId, audioId, userId: user.id });

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

    const rawResponseData = await sunoResponse.json();
    logger.info("Suno API raw response", {
      status: sunoResponse.status,
      dataPreview: JSON.stringify(rawResponseData).slice(0, 200),
    });

    if (!sunoResponse.ok) {
        logger.error("[GET-TIMESTAMPED-LYRICS] Suno API returned error status", {
            status: sunoResponse.status,
            response: rawResponseData,
        });

        if (sunoResponse.status === 404) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'LYRICS_NOT_READY',
                    message: (rawResponseData && (rawResponseData.message || rawResponseData.error)) || 'Timestamped lyrics are not available yet',
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }
    }

    const validationResult = sunoResponseSchema.safeParse(rawResponseData);

    if (!validationResult.success) {
      logger.error("Suno API response validation failed", {
        error: validationResult.error.format(),
        rawData: JSON.stringify(rawResponseData).slice(0, 500),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_RESPONSE_FORMAT",
          message: "Invalid response format from Suno API",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const normalizedData = normalizeSunoResponse(validationResult.data);

    if (!normalizedData || !normalizedData.alignedWords || normalizedData.alignedWords.length === 0) {
      logger.warn("[GET-TIMESTAMPED-LYRICS] Normalized data is null or empty - lyrics not ready", {
        rawData: JSON.stringify(rawResponseData).slice(0, 500),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "LYRICS_NOT_READY",
          message: "Timestamped lyrics data is not available yet",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    logger.info("[GET-TIMESTAMPED-LYRICS] Successfully normalized response", {
      wordCount: normalizedData.alignedWords.length,
    });

    return new Response(JSON.stringify(normalizedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
