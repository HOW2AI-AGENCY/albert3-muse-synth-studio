import { logger } from "./logger.ts";
import { SunoApiError } from "./suno.error.ts";
import type {
  SunoStemRequest,
  SunoStemResult,
  SunoStemQueryResult,
  SunoStemAsset,
} from "./suno.types.ts";
import {
  appendQueryParam,
  buildSunoHeaders,
  DEFAULT_STEM_ENDPOINTS,
  DEFAULT_STEM_QUERY_ENDPOINTS,
  safeParseJson,
} from "./suno.utils.ts";

export const requestStemSeparation = async (
  input: SunoStemRequest,
  apiKey: string,
  fetchImpl: typeof fetch,
  stemEndpoints: string[] = DEFAULT_STEM_ENDPOINTS
): Promise<SunoStemResult> => {
  const errors: SunoApiError[] = [];
  for (const endpoint of stemEndpoints) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: buildSunoHeaders(apiKey, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(input),
      });

      const rawText = await response.text();
      const { json, parseError } = safeParseJson(rawText);

      if (!response.ok) {
        throw new SunoApiError(
          `Suno stem request failed with status ${response.status}`,
          {
            endpoint,
            status: response.status,
            body: rawText,
          }
        );
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno stem response", {
          endpoint,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      const data = (json as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      const taskId = data?.taskId as string;
      if (typeof taskId !== "string" || !taskId) {
        throw new SunoApiError(
          "Suno stem response did not include a task identifier",
          {
            endpoint,
            status: response.status,
            body: rawText,
          }
        );
      }

      return { taskId, rawResponse: json, endpoint };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno stem error",
              {
                endpoint,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] Stem request failed", {
        endpoint,
        message: sunoError.message,
        status: sunoError.details.status,
      });
    }
  }

  const summary = errors
    .map((err) => `${err.details.endpoint}: ${err.message}`)
    .join("; ");
  throw new SunoApiError(`All Suno stem endpoints failed. Attempts: ${summary}`, {
    endpoint: stemEndpoints.join(", "),
  });
};

export const queryStemTask = async (
  taskId: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  stemQueryEndpoints: string[] = DEFAULT_STEM_QUERY_ENDPOINTS
): Promise<SunoStemQueryResult> => {
  const errors: SunoApiError[] = [];

  for (const endpoint of stemQueryEndpoints) {
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
          `Suno stem query failed with status ${response.status}`,
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      if (parseError) {
        throw new SunoApiError("Unable to parse Suno stem query response", {
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
      const status = data?.successFlag as SunoStemQueryResult["status"];
      const message = (data?.errorMessage ??
        (json as Record<string, unknown>)?.msg) as string | null;
      const code = (json as Record<string, unknown>)?.code;
      const resolvedTaskId = (data?.taskId as string) ?? taskId;

      if (!status) {
        throw new SunoApiError(
          "Suno stem query response did not include status",
          {
            endpoint: url,
            status: response.status,
            body: rawText,
          }
        );
      }

      const assets: SunoStemAsset[] = [];
      const stemResponse = data?.response;
      if (stemResponse && typeof stemResponse === "object") {
        for (const [key, value] of Object.entries(stemResponse)) {
          if (typeof value === "string" && key.endsWith("Url")) {
            const instrument = key.replace("Url", "");
            assets.push({ instrument, url: value });
          }
        }
      }

      return {
        taskId: resolvedTaskId,
        assets,
        status,
        rawResponse: json,
        endpoint: endpoint,
        code: typeof code === "number" ? code : undefined,
        message: typeof message === "string" ? message : null,
      };
    } catch (error) {
      const sunoError =
        error instanceof SunoApiError
          ? error
          : new SunoApiError(
              (error as Error)?.message ?? "Unknown Suno stem query error",
              {
                endpoint,
                cause: error,
              }
            );
      errors.push(sunoError);
      logger.error("🔴 [SUNO] Stem query failed", {
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
    `All Suno stem query endpoints failed. Attempts: ${summary}`,
    {
      endpoint: stemQueryEndpoints.join(", "),
    }
  );
};
