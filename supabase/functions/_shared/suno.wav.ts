import { logger } from "./logger.ts";
import { SunoApiError } from "./suno.error.ts";
import type {
  SunoWavRequest,
  SunoWavResult,
  SunoWavQueryResult,
} from "./suno.types.ts";
import {
  appendQueryParam,
  buildSunoHeaders,
  safeParseJson,
} from "./suno.utils.ts";

export const convertToWav = async (
  request: SunoWavRequest,
  apiKey: string,
  fetchImpl: typeof fetch,
  wavGenerateEndpoints?: string[]
): Promise<SunoWavResult> => {
  const wavEndpoints = wavGenerateEndpoints ?? [
    "https://api.sunoapi.org/api/v1/wav/generate",
  ];

  const errors: SunoApiError[] = [];

  for (const endpoint of wavEndpoints) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: buildSunoHeaders(apiKey),
        body: JSON.stringify({
          taskId: request.taskId,
          audioId: request.audioId,
          callBackUrl: request.callBackUrl,
        }),
      });

      const rawText = await response.text();
      const { json, parseError } = safeParseJson(rawText);

      if (!response.ok) {
        throw new SunoApiError(
          `Suno WAV conversion failed with status ${response.status}`,
          {
            endpoint,
            status: response.status,
            body: rawText,
          }
        );
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno WAV response", {
          endpoint,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      const taskId = (json as Record<string, any>)?.data?.taskId;
      if (!taskId) {
        throw new SunoApiError("Suno WAV response did not include taskId", {
          endpoint,
          status: response.status,
          body: rawText,
        });
      }

      return {
        taskId,
        rawResponse: json,
        endpoint,
      };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno WAV error",
              {
                endpoint,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] WAV conversion request failed", {
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
    `All Suno WAV endpoints failed. Attempts: ${summary}`,
    {
      endpoint: wavEndpoints.join(", "),
    }
  );
};

export const queryWavTask = async (
  taskId: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  wavQueryEndpoints?: string[]
): Promise<SunoWavQueryResult> => {
  const wavQueryEps = wavQueryEndpoints ?? [
    "https://api.sunoapi.org/api/v1/wav/record-info",
  ];

  const errors: SunoApiError[] = [];

  for (const endpoint of wavQueryEps) {
    try {
      const url = appendQueryParam(endpoint, { taskId });
      const response = await fetchImpl(url, {
        method: "GET",
        headers: buildSunoHeaders(apiKey),
      });

      const rawText = await response.text();
      const { json, parseError } = safeParseJson(rawText);

      if (!response.ok) {
        throw new SunoApiError(
          `Suno WAV query failed with status ${response.status}`,
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno WAV query response", {
          endpoint: url,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      const data = (json as Record<string, any>)?.data;
      const status = data?.successFlag;
      const message = data?.errorMessage ?? (json as Record<string, any>)?.msg;
      const code = (json as Record<string, any>)?.code;
      const resolvedTaskId = data?.taskId ?? taskId;
      const musicId = data?.musicId;
      const wavUrl = data?.response?.audioWavUrl;

      if (!status) {
        throw new SunoApiError(
          "Suno WAV query response did not include status",
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      return {
        taskId: resolvedTaskId,
        musicId,
        status,
        wavUrl,
        rawResponse: json,
        endpoint,
        code: typeof code === "number" ? code : undefined,
        message: typeof message === "string" ? message : null,
      };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno WAV query error",
              {
                endpoint,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] WAV query failed", {
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
    `All Suno WAV query endpoints failed. Attempts: ${summary}`,
    {
      endpoint: wavQueryEps.join(", "),
    }
  );
};
