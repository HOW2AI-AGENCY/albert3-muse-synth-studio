import { logger } from "./logger.ts";
import { CircuitBreaker } from "./circuit-breaker.ts";
import { SunoApiError } from "./suno.error.ts";
import type {
  SunoGenerationPayload,
  SunoGenerationResult,
  SunoQueryResult,
  SunoTaskStatus,
  SunoTrack,
} from "./suno.types.ts";
import {
  appendQueryParam,
  buildSunoHeaders,
  DEFAULT_GENERATE_ENDPOINTS,
  DEFAULT_QUERY_ENDPOINTS,
  parseTaskId,
  safeParseJson,
} from "./suno.utils.ts";

// This circuit breaker could be shared across different modules if needed
const sunoCircuitBreaker = new CircuitBreaker(5, 60000, 30000);

export const generateTrack = async (
  payload: SunoGenerationPayload,
  apiKey: string,
  fetchImpl: typeof fetch,
  generateEndpoints: string[] = DEFAULT_GENERATE_ENDPOINTS
): Promise<SunoGenerationResult> => {
  return await sunoCircuitBreaker.call(async () => {
    const errors: SunoApiError[] = [];
    const MAX_RETRIES = 3;
    const BACKOFF_BASE_MS = 1000;

    for (const endpoint of generateEndpoints) {
      for (let retryAttempt = 0; retryAttempt <= MAX_RETRIES; retryAttempt++) {
        try {
          const apiPayload: Record<string, unknown> = {
            prompt: payload.prompt,
            tags: payload.tags || [],
            title: payload.title,
            instrumental: payload.make_instrumental ?? false,
            model: payload.model || "V5",
            customMode: payload.customMode ?? false,
          };

          if (payload.callBackUrl) apiPayload.callBackUrl = payload.callBackUrl;
          if (payload.negativeTags) apiPayload.negativeTags = payload.negativeTags;
          if (payload.vocalGender) apiPayload.vocalGender = payload.vocalGender;
          if (payload.styleWeight !== undefined)
            apiPayload.styleWeight = payload.styleWeight;
          if (payload.weirdnessConstraint !== undefined)
            apiPayload.weirdnessConstraint = payload.weirdnessConstraint;
          if (payload.audioWeight !== undefined)
            apiPayload.audioWeight = payload.audioWeight;
          if (payload.referenceAudioUrl)
            apiPayload.referenceAudioUrl = payload.referenceAudioUrl;

          logger.debug("Suno payload transformation", {
            before: { make_instrumental: payload.make_instrumental },
            after: { instrumental: apiPayload.instrumental },
            hasReference: !!payload.referenceAudioUrl,
          });

          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: buildSunoHeaders(apiKey, {
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(apiPayload),
          });

          const rawText = await response.text();
          const { json, parseError } = safeParseJson(rawText);

          logger.debug("Suno API raw response", {
            endpoint,
            status: response.status,
            bodyLength: rawText.length,
            bodyPreview: rawText.substring(0, 500),
            parseError: parseError?.message,
          });

          if (json && typeof json === "object") {
            logger.debug("Suno API response structure", {
              keys: Object.keys(json as Record<string, unknown>),
              isArray: Array.isArray(json),
            });
          }

          if (response.status === 429 && retryAttempt < MAX_RETRIES) {
            const backoffMs = BACKOFF_BASE_MS * Math.pow(2, retryAttempt);
            logger.warn(
              `Suno rate limit hit, retry ${retryAttempt + 1}/${MAX_RETRIES}`,
              {
                endpoint,
                backoffMs,
              }
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          if (!response.ok) {
            throw new SunoApiError(
              `Suno generation failed with status ${response.status}`,
              {
                endpoint,
                status: response.status,
                body: rawText,
              }
            );
          }

          if (parseError) {
            throw new SunoApiError("Unable to parse Suno generation response", {
              endpoint,
              status: response.status,
              body: rawText,
              cause: parseError,
            });
          }
          if (json && typeof json === "object" && "code" in json) {
            const codeVal = Number((json as Record<string, unknown>).code);
            if (!Number.isNaN(codeVal) && codeVal !== 200) {
              const apiMsg =
                (json as Record<string, unknown>).msg ||
                "Suno API responded with an error";
              throw new SunoApiError(String(apiMsg), {
                endpoint,
                status: response.status,
                body: rawText,
              });
            }
          }

          const { taskId, jobId } = parseTaskId(json);
          if (typeof taskId !== "string" || !taskId) {
            throw new SunoApiError(
              "Suno generation response did not include a task identifier",
              {
                endpoint,
                status: response.status,
                body: rawText,
              }
            );
          }

          return { taskId, jobId: jobId ?? null, rawResponse: json, endpoint };
        } catch (error) {
          const sunoError =
            error instanceof SunoApiError
              ? error
              : new SunoApiError(
                  (error as Error)?.message ?? "Unknown Suno generation error",
                  {
                    endpoint,
                    cause: error,
                  }
                );
          errors.push(sunoError);
          logger.error("🔴 [SUNO] Generation attempt failed", {
            endpoint,
            message: sunoError.message,
            status: sunoError.details.status,
            retryAttempt,
          });

          break;
        }
      }
    }

    const summary = errors
      .map((err) => `${err.details.endpoint}: ${err.message}`)
      .join("; ");
    throw new SunoApiError(
      `All Suno generation endpoints failed. Attempts: ${summary}`,
      {
        endpoint: generateEndpoints.join(", "),
      }
    );
  });
};

export const queryTask = async (
  taskId: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  queryEndpoints: string[] = DEFAULT_QUERY_ENDPOINTS
): Promise<SunoQueryResult> => {
  const errors: SunoApiError[] = [];
  for (const endpoint of queryEndpoints) {
    const url = appendQueryParam(endpoint, { taskId });
    try {
      const response = await fetchImpl(url, {
        headers: buildSunoHeaders(apiKey),
      });

      const rawText = await response.text();
      const { json, parseError } = safeParseJson(rawText);

      if (!response.ok) {
        throw new SunoApiError(`Suno query failed with status ${response.status}`, {
          endpoint: url,
          status: response.status,
          body: rawText,
        });
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno task response", {
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
      const status = data?.status as SunoTaskStatus["status"];
      const tasks =
        (((data?.response as Record<string, unknown>)?.sunoData as SunoTrack[]) ??
        []);

      if (!status) {
        throw new SunoApiError(
          "Suno query response did not include task status",
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      const code =
        typeof (json as Record<string, unknown>)?.code === "number"
          ? ((json as Record<string, unknown>).code as number)
          : undefined;
      return { status, tasks, rawResponse: json, endpoint: url, code };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno query error",
              {
                endpoint: url,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] Query attempt failed", {
        endpoint: url,
        message: sunoError.message,
        status: sunoError.details.status,
      });
    }
  }

  const summary = errors
    .map((err) => `${err.details.endpoint}: ${err.message}`)
    .join("; ");
  throw new SunoApiError(`All Suno query endpoints failed. Attempts: ${summary}`, {
    endpoint: queryEndpoints.join(", "),
  });
};
