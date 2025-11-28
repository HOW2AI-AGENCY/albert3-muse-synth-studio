import { logger } from "./logger.ts";
import { SunoApiError } from "./suno.error.ts";
import type {
  SunoLyricsPayload,
  SunoLyricsGenerationResult,
  SunoLyricsQueryResult,
  SunoLyricsVariantStatus,
} from "./suno.types.ts";
import {
  appendQueryParam,
  buildSunoHeaders,
  DEFAULT_LYRICS_GENERATE_ENDPOINTS,
  DEFAULT_LYRICS_QUERY_ENDPOINTS,
  parseTaskId,
  safeParseJson,
} from "./suno.utils.ts";

export const generateLyrics = async (
  payload: SunoLyricsPayload,
  apiKey: string,
  fetchImpl: typeof fetch,
  lyricsGenerateEndpoints: string[] = DEFAULT_LYRICS_GENERATE_ENDPOINTS
): Promise<SunoLyricsGenerationResult> => {
  const errors: SunoApiError[] = [];

  for (const endpoint of lyricsGenerateEndpoints) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: buildSunoHeaders(apiKey, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      const { json, parseError } = safeParseJson(rawText);

      if (!response.ok) {
        throw new SunoApiError(
          `Suno lyrics generation failed with status ${response.status}`,
          {
            endpoint,
            status: response.status,
            body: rawText,
          }
        );
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno lyrics response", {
          endpoint,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      logger.info("🔍 Suno lyrics raw response", {
        endpoint,
        json: JSON.stringify(json),
        jsonKeys: json && typeof json === "object" ? Object.keys(json) : [],
      });

      const { taskId, jobId } = parseTaskId(json);

      if (typeof taskId !== "string" || !taskId) {
        logger.error("❌ Failed to extract taskId from lyrics response", {
          endpoint,
          responseStructure:
            json && typeof json === "object" ? Object.keys(json) : [],
          fullResponse: JSON.stringify(json).substring(0, 500),
        });

        throw new SunoApiError(
          "Suno lyrics response did not include a task identifier",
          {
            endpoint,
            status: response.status,
            body: rawText,
          }
        );
      }

      logger.info("✅ Lyrics taskId extracted", { taskId, jobId, endpoint });
      return { taskId, jobId: jobId ?? null, rawResponse: json, endpoint };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno lyrics error",
              {
                endpoint,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] Lyrics generation attempt failed", {
        endpoint,
        message: sunoError.message,
        status: sunoError.details.status,
      });
    }
  }

  const summary = errors
    .map((err) => `${err.details.endpoint}: ${err.message}`)
    .join("; ");
  throw new SunoApiError(
    `All Suno lyrics endpoints failed. Attempts: ${summary}`,
    {
      endpoint: lyricsGenerateEndpoints.join(", "),
    }
  );
};

export const queryLyricsTask = async (
  taskId: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  lyricsQueryEndpoints: string[] = DEFAULT_LYRICS_QUERY_ENDPOINTS
): Promise<SunoLyricsQueryResult> => {
  const errors: SunoApiError[] = [];
  for (const endpoint of lyricsQueryEndpoints) {
    const url = appendQueryParam(endpoint, { taskId });
    try {
      const response = await fetchImpl(url, {
        headers: buildSunoHeaders(apiKey),
      });

      const rawText = await response.text();
      const { json, parseError } = safeParseJson(rawText);

      if (!response.ok) {
        throw new SunoApiError(
          `Suno lyrics query failed with status ${response.status}`,
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno lyrics query response", {
          endpoint: url,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      const data = (json as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      const status = data?.status as string;
      const variants = (data?.data as SunoLyricsVariantStatus[]) ?? [];
      const resolvedTaskId = (data?.taskId as string) ?? taskId;
      const code = (json as Record<string, unknown>)?.code;

      if (!status) {
        throw new SunoApiError(
          "Suno lyrics query response did not include status",
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      return {
        taskId: resolvedTaskId,
        data: variants,
        status,
        rawResponse: json,
        endpoint: url,
        code: typeof code === "number" ? code : undefined,
      };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno lyrics query error",
              {
                endpoint: url,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] Lyrics query attempt failed", {
        endpoint: url,
        message: sunoError.message,
        status: sunoError.details.status,
      });
    }
  }

  const summary = errors
    .map((err) => `${err.details.endpoint}: ${err.message}`)
    .join("; ");
  throw new SunoApiError(
    `All Suno lyrics query endpoints failed. Attempts: ${summary}`,
    {
      endpoint: lyricsQueryEndpoints.join(", "),
    }
  );
};
