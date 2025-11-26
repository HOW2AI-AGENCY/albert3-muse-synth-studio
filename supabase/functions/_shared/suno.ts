import {
  createExtendTrack,
  createGenerateCoverImage,
  createBoostStyle,
  createGetTimestampedLyrics,
  type SunoExtendRequest,
  type SunoExtendResult,
  type SunoCoverImageRequest,
  type SunoCoverImageResult,
  type SunoBoostStyleRequest,
  type SunoBoostStyleResult,
  type SunoTimestampedLyricsRequest,
  type SunoTimestampedLyricsResult,
} from "./suno-extended.ts";

export interface SunoGenerationPayload {
  prompt: string;
  tags?: string[];
  title?: string;
  customMode?: boolean;
  make_instrumental?: boolean;
  model?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
  referenceAudioUrl?: string;
  personaId?: string;
}

export interface SunoLyricsPayload {
  prompt: string;
  callBackUrl: string;
}

export interface SunoTrack {
  id: string;
  audioUrl: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  prompt?: string;
  modelName: string;
  title: string;
  tags?: string;
  createTime: string;
  duration: number;
}

export interface SunoTaskStatus {
  taskId: string;
  parentMusicId?: string;
  param: string;
  response: {
    taskId: string;
    sunoData: SunoTrack[];
  };
  status: "PENDING" | "TEXT_SUCCESS" | "FIRST_SUCCESS" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION" | "SENSITIVE_WORD_ERROR";
  type: "GENERATE";
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SunoGenerationResult {
  taskId: string;
  jobId?: string | null;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoLyricsGenerationResult {
  taskId: string;
  jobId?: string | null;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoQueryResult {
  status: SunoTaskStatus["status"];
  tasks: SunoTrack[];
  rawResponse: unknown;
  endpoint: string;
  code?: number;
}

export interface SunoLyricsVariantStatus {
  text?: string;
  title?: string;
  status?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

export interface SunoLyricsResult {
  taskId: string;
  status: string;
  data: SunoLyricsVariantStatus[];
}

export interface SunoLyricsQueryResult {
  taskId: string;
  status: string,
  data: SunoLyricsVariantStatus[];
  rawResponse: unknown;
  endpoint: string;
  code?: number;
}

export interface SunoStemRequest {
  taskId: string;
  audioId: string;
  type: "separate_vocal" | "split_stem";
  callBackUrl?: string;
}

export interface SunoStemResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoStemAsset {
  instrument: string;
  url: string;
}

export interface SunoStemQueryResult {
  taskId: string;
  assets: SunoStemAsset[];
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION";
  rawResponse: unknown;
  endpoint: string;
  code?: number;
  message?: string | null;
}

export interface SunoWavRequest {
  taskId: string;
  audioId: string;
  callBackUrl: string;
}

export interface SunoWavResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoWavQueryResult {
  taskId: string;
  musicId: string;
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_WAV_FAILED" | "CALLBACK_EXCEPTION";
  wavUrl?: string;
  rawResponse: unknown;
  endpoint: string;
  code?: number;
  message?: string | null;
}

export type {
  SunoExtendRequest,
  SunoExtendResult,
  SunoCoverImageRequest,
  SunoCoverImageResult,
  SunoBoostStyleRequest,
  SunoBoostStyleResult,
  SunoTimestampedLyricsRequest,
  SunoTimestampedLyricsResult,
} from "./suno-extended.ts";

export interface CreateSunoClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  generateEndpoints?: string[];
  queryEndpoints?: string[];
  stemEndpoints?: string[];
  stemQueryEndpoints?: string[];
  lyricsGenerateEndpoints?: string[];
  lyricsQueryEndpoints?: string[];
  wavGenerateEndpoints?: string[];
  wavQueryEndpoints?: string[];
}

export class SunoApiError extends Error {
  constructor(
    message: string,
    readonly details: {
      endpoint: string;
      status?: number;
      body?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "SunoApiError";
  }
}

import { CircuitBreaker } from "./circuit-breaker.ts";
const sunoCircuitBreaker = new CircuitBreaker(5, 60000, 30000);

const unique = (values: (string | undefined | null)[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!value) continue;

    const segments = value.split(",").map((segment) => segment.trim()).filter(Boolean);
    for (const segment of segments) {
      if (!segment) continue;
      const key = segment.endsWith("/") ? segment.slice(0, -1) : segment;
      if (!key) continue;
      if (!seen.has(key)) {
        seen.add(key);
        output.push(key);
      }
    }
  }
  return output;
};

const DEFAULT_GENERATE_ENDPOINTS = unique([
  Deno.env.get("SUNO_GENERATE_URL"),
  "https://api.sunoapi.org/api/v1/generate",
]);

const DEFAULT_QUERY_ENDPOINTS = unique([
  Deno.env.get("SUNO_QUERY_URL"),
  "https://api.sunoapi.org/api/v1/generate/record-info",
]);

const DEFAULT_STEM_ENDPOINTS = unique([
  Deno.env.get("SUNO_STEM_URL"),
  "https://api.sunoapi.org/api/v1/vocal-removal/generate",
]);

const DEFAULT_STEM_QUERY_ENDPOINTS = unique([
  Deno.env.get("SUNO_STEM_QUERY_URL"),
  "https://api.sunoapi.org/api/v1/vocal-removal/record-info",
]);

const DEFAULT_LYRICS_GENERATE_ENDPOINTS = unique([
  Deno.env.get("SUNO_LYRICS_URL"),
  "https://api.sunoapi.org/api/v1/lyrics",
]);

const DEFAULT_LYRICS_QUERY_ENDPOINTS = unique([
  Deno.env.get("SUNO_LYRICS_QUERY_URL"),
  "https://api.sunoapi.org/api/v1/lyrics/record-info",
]);

const appendQueryParam = (base: string, params: Record<string, string>): string => {
  const query = new URLSearchParams(params);
  if (base.includes("{taskId}")) {
    return base.replace("{taskId}", encodeURIComponent(params.taskId));
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${query.toString()}`;
};

const extractCallbackUrl = (
  payload: { callBackUrl?: string | null; callbackUrl?: string | null; callback_url?: string | null },
): string | undefined => {
  const candidates = [payload.callBackUrl, payload.callbackUrl, payload.callback_url];
  for (const value of candidates) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const applyCallbackAliases = (
  target: Record<string, unknown>,
  callbackUrl: string | undefined,
) => {
  if (!callbackUrl) return target;
  target.callBackUrl = callbackUrl;
  target.callbackUrl = callbackUrl;
  target.callback_url = callbackUrl;
  return target;
};

const dropUndefined = (input: Record<string, unknown>): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
};

const safeParseJson = (
  rawText: string,
): { json: unknown; parseError?: Error } => {
  if (!rawText) {
    return { json: null };
  }

  try {
    return { json: JSON.parse(rawText) };
  } catch (error) {
    return { json: null, parseError: error instanceof Error ? error : new Error(String(error)) };
  }
};

export const buildSunoHeaders = (
  apiKey: string,
  extraHeaders: Record<string, string | undefined> = {},
): Record<string, string> => {
  const baseHeaders: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
    "api-key": apiKey,
    "Accept": "application/json",
    "User-Agent": "albert3-muse-synth-studio/edge",
  };

  for (const [key, value] of Object.entries(extraHeaders)) {
    if (typeof value === "string" && value.length > 0) {
      baseHeaders[key] = value;
    }
  }

  return baseHeaders;
};

import { logger } from "./logger.ts";

const parseTaskId = (payload: unknown): { taskId?: string; jobId?: string | null } => {
  if (!payload || typeof payload !== "object") {
    logger.warn('Invalid Suno payload type', { type: typeof payload });
    return {};
  }

  const normaliseString = (value: unknown): string | undefined => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === "number") {
      const s = String(value);
      return s.length > 0 ? s : undefined;
    }
    return undefined;
  };

  const TASK_ID_KEYS = ["taskId", "task_id", "id"] as const;
  const JOB_ID_KEYS = ["jobId", "job_id"] as const;

  const record = payload as Record<string, unknown>;

  for (const key of TASK_ID_KEYS) {
    const candidate = normaliseString(record[key]);
    if (candidate) {
      logger.info('Found taskId directly', { key, taskId: candidate });
      return { taskId: candidate, jobId: normaliseString(record.jobId || record.job_id) ?? null };
    }
  }

  if ('data' in record && record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    const result = parseTaskId(record.data);
    if (result.taskId) {
      logger.info('Found taskId in data object');
      return result;
    }
  }

  if ('data' in record && typeof record.data === 'string') {
    const candidate = normaliseString(record.data);
    if (candidate) {
      logger.info('Found taskId in data string');
      return { taskId: candidate, jobId: normaliseString(record.jobId || record.job_id) ?? null };
    }
  }

  if ('data' in record && Array.isArray(record.data) && record.data.length > 0) {
    const first = record.data[0];
    if (first && typeof first === 'object') {
      const result = parseTaskId(first);
      if (result.taskId) {
        logger.info('Found taskId in data array');
        return result;
      }
    }
  }

  if ('result' in record || 'response' in record) {
    const nested = record.result || record.response;
    if (nested && typeof nested === 'object') {
      const result = parseTaskId(nested);
      if (result.taskId) {
        logger.info('Found taskId in nested object');
        return result;
      }
    }
  }

  try {
    const queue: unknown[] = [record];
    const seen = new Set<unknown>();
    let foundTask: string | undefined;
    let foundJob: string | undefined;
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== 'object' || seen.has(node)) continue;
      seen.add(node);

      for (const [k, v] of Object.entries(node)) {
        const key = String(k).toLowerCase();
        const candidate = normaliseString(v as unknown);
        if (!foundTask && (key === 'taskid' || key === 'task_id' || key === 'task-id' || key === 'task')) {
          if (candidate) { foundTask = candidate; }
        }
        if (!foundJob && (key === 'jobid' || key === 'job_id' || key === 'job-id')) {
          if (candidate) { foundJob = candidate; }
        }
        if (v && typeof v === 'object') queue.push(v);
      }

      if (foundTask) {
        logger.info('Found taskId via deep scan');
        return { taskId: foundTask, jobId: foundJob ?? null };
      }
    }
  } catch {
    // ignore
  }
  
  return {};
};

export const createSunoClient = (options: CreateSunoClientOptions) => {
  const {
    apiKey,
    fetchImpl = fetch,
    generateEndpoints = DEFAULT_GENERATE_ENDPOINTS,
    queryEndpoints = DEFAULT_QUERY_ENDPOINTS,
    stemEndpoints = DEFAULT_STEM_ENDPOINTS,
    stemQueryEndpoints = DEFAULT_STEM_QUERY_ENDPOINTS,
    lyricsGenerateEndpoints = DEFAULT_LYRICS_GENERATE_ENDPOINTS,
    lyricsQueryEndpoints = DEFAULT_LYRICS_QUERY_ENDPOINTS,
    wavGenerateEndpoints,
    wavQueryEndpoints,
  } = options;

  if (!apiKey) {
    throw new Error("SUNO_API_KEY is required to create a Suno client");
  }

  const generateTrack = async (payload: SunoGenerationPayload): Promise<SunoGenerationResult> => {
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
      model: payload.model || 'V5',
      customMode: payload.customMode ?? false,
    };

    if (payload.callBackUrl) apiPayload.callBackUrl = payload.callBackUrl;
    if (payload.negativeTags) apiPayload.negativeTags = payload.negativeTags;
    if (payload.vocalGender) apiPayload.vocalGender = payload.vocalGender;
    if (payload.styleWeight !== undefined) apiPayload.styleWeight = payload.styleWeight;
    if (payload.weirdnessConstraint !== undefined) apiPayload.weirdnessConstraint = payload.weirdnessConstraint;
    if (payload.audioWeight !== undefined) apiPayload.audioWeight = payload.audioWeight;
    if (payload.referenceAudioUrl) apiPayload.referenceAudioUrl = payload.referenceAudioUrl;

    logger.debug('Suno payload transformation', {
      before: { make_instrumental: payload.make_instrumental },
      after: { instrumental: apiPayload.instrumental },
      hasReference: !!payload.referenceAudioUrl
    });

          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
            body: JSON.stringify(apiPayload),
          });

          const rawText = await response.text();
          const { json, parseError } = safeParseJson(rawText);

          logger.debug('Suno API raw response', {
            endpoint,
            status: response.status,
            bodyLength: rawText.length,
            bodyPreview: rawText.substring(0, 500),
            parseError: parseError?.message
          });

          if (json && typeof json === 'object') {
            logger.debug('Suno API response structure', {
              keys: Object.keys(json as Record<string, unknown>),
              isArray: Array.isArray(json)
            });
          }

          if (response.status === 429 && retryAttempt < MAX_RETRIES) {
            const backoffMs = BACKOFF_BASE_MS * Math.pow(2, retryAttempt);
            logger.warn(`Suno rate limit hit, retry ${retryAttempt + 1}/${MAX_RETRIES}`, {
              endpoint,
              backoffMs
            });
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }

          if (!response.ok) {
            throw new SunoApiError(`Suno generation failed with status ${response.status}`, {
              endpoint,
              status: response.status,
              body: rawText,
            });
          }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno generation response", {
            endpoint,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }
        if (json && typeof json === 'object' && 'code' in json) {
          const codeVal = Number((json as Record<string, unknown>).code);
          if (!Number.isNaN(codeVal) && codeVal !== 200) {
            const apiMsg = (json as Record<string, unknown>).msg || 'Suno API responded with an error';
            throw new SunoApiError(String(apiMsg), {
              endpoint,
              status: response.status,
              body: rawText,
            });
          }
        }

        const { taskId, jobId } = parseTaskId(json);
        if (typeof taskId !== "string" || !taskId) {
          throw new SunoApiError("Suno generation response did not include a task identifier", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return { taskId, jobId: jobId ?? null, rawResponse: json, endpoint };
        } catch (error) {
          const sunoError = error instanceof SunoApiError
            ? error
            : new SunoApiError((error as Error)?.message ?? "Unknown Suno generation error", {
              endpoint,
              cause: error,
            });
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

      const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
      throw new SunoApiError(`All Suno generation endpoints failed. Attempts: ${summary}`, {
        endpoint: generateEndpoints.join(", "),
      });
    });
  };

  const generateLyrics = async (payload: SunoLyricsPayload): Promise<SunoLyricsGenerationResult> => {
    const errors: SunoApiError[] = [];

    for (const endpoint of lyricsGenerateEndpoints) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

        if (!response.ok) {
          throw new SunoApiError(`Suno lyrics generation failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
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
          jsonKeys: json && typeof json === 'object' ? Object.keys(json) : []
        });

        const { taskId, jobId } = parseTaskId(json);

        if (typeof taskId !== "string" || !taskId) {
          logger.error("❌ Failed to extract taskId from lyrics response", {
            endpoint,
            responseStructure: json && typeof json === 'object' ? Object.keys(json) : [],
            fullResponse: JSON.stringify(json).substring(0, 500)
          });
          
          throw new SunoApiError("Suno lyrics response did not include a task identifier", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        logger.info("✅ Lyrics taskId extracted", { taskId, jobId, endpoint });
        return { taskId, jobId: jobId ?? null, rawResponse: json, endpoint };
      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno lyrics error", {
            endpoint,
            cause: error,
          });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] Lyrics generation attempt failed", {
          endpoint,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno lyrics endpoints failed. Attempts: ${summary}`, {
      endpoint: lyricsGenerateEndpoints.join(", "),
    });
  };

  const queryTask = async (taskId: string): Promise<SunoQueryResult> => {
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

        const data = (json as Record<string, unknown>)?.data as Record<string, unknown>;
        const status = data?.status as SunoTaskStatus["status"];
        const tasks = (data?.response as Record<string, unknown>)?.sunoData as SunoTrack[] ?? [];

        if (!status) {
           throw new SunoApiError("Suno query response did not include task status", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        const code = typeof (json as Record<string, unknown>)?.code === "number" ? (json as Record<string, unknown>).code as number : undefined;
        return { status, tasks, rawResponse: json, endpoint: url, code };

      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno query error", {
            endpoint: url,
            cause: error,
          });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] Query attempt failed", {
          endpoint: url,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno query endpoints failed. Attempts: ${summary}`, {
      endpoint: queryEndpoints.join(", "),
    });
  };

  const queryLyricsTask = async (taskId: string): Promise<SunoLyricsQueryResult> => {
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
          throw new SunoApiError(`Suno lyrics query failed with status ${response.status}`, {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno lyrics query response", {
            endpoint: url,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = (json as Record<string, unknown>)?.data as Record<string, unknown>;
        const status = data?.status as string;
        const variants = data?.data as SunoLyricsVariantStatus[] ?? [];
        const resolvedTaskId = (data?.taskId as string) ?? taskId;
        const code = (json as Record<string, unknown>)?.code;

        if (!status) {
          throw new SunoApiError("Suno lyrics query response did not include status", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        return {
          taskId: resolvedTaskId,
          data: variants,
          status,
          rawResponse: json,
          endpoint: url,
          code: typeof code === 'number' ? code : undefined,
        };

      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno lyrics query error", {
            endpoint: url,
            cause: error,
          });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] Lyrics query attempt failed", {
          endpoint: url,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno lyrics query endpoints failed. Attempts: ${summary}`, {
      endpoint: lyricsQueryEndpoints.join(", "),
    });
  };

  const requestStemSeparation = async (input: SunoStemRequest): Promise<SunoStemResult> => {
    const errors: SunoApiError[] = [];
    for (const endpoint of stemEndpoints) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
          body: JSON.stringify(input),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

        if (!response.ok) {
          throw new SunoApiError(`Suno stem request failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno stem response", {
            endpoint,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = (json as Record<string, unknown>)?.data as Record<string, unknown>;
        const taskId = data?.taskId as string;
        if (typeof taskId !== 'string' || !taskId) {
          throw new SunoApiError("Suno stem response did not include a task identifier", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return { taskId, rawResponse: json, endpoint };
      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno stem error", {
            endpoint,
            cause: error,
          });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] Stem request failed", {
          endpoint,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno stem endpoints failed. Attempts: ${summary}`, {
      endpoint: stemEndpoints.join(", "),
    });
  };

  const queryStemTask = async (taskId: string): Promise<SunoStemQueryResult> => {
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
          throw new SunoApiError(`Suno stem query failed with status ${response.status}`, {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno stem query response", {
            endpoint: url,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = (json as Record<string, unknown>)?.data as Record<string, unknown>;
        const status = data?.successFlag as SunoStemQueryResult["status"];
        const message = (data?.errorMessage ?? (json as Record<string, unknown>)?.msg) as string | null;
        const code = (json as Record<string, unknown>)?.code;
        const resolvedTaskId = (data?.taskId as string) ?? taskId;

        if (!status) {
          throw new SunoApiError("Suno stem query response did not include status", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        const assets: SunoStemAsset[] = [];
        const stemResponse = data?.response;
        if (stemResponse && typeof stemResponse === 'object') {
          for (const [key, value] of Object.entries(stemResponse)) {
            if (typeof value === 'string' && key.endsWith('Url')) {
              const instrument = key.replace('Url', '');
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
          code: typeof code === 'number' ? code : undefined,
          message: typeof message === 'string' ? message : null,
        };
      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno stem query error", {
            endpoint,
            cause: error,
          });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] Stem query failed", {
          endpoint,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno stem query endpoints failed. Attempts: ${summary}`, {
      endpoint: stemQueryEndpoints.join(", "),
    });
  };

  const convertToWav = async (request: SunoWavRequest): Promise<SunoWavResult> => {
    const wavEndpoints = wavGenerateEndpoints ?? [
      "https://api.sunoapi.org/api/v1/wav/generate"
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
          throw new SunoApiError(`Suno WAV conversion failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
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
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno WAV error", {
              endpoint,
              cause: error,
            });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] WAV conversion request failed", {
          endpoint,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno WAV endpoints failed. Attempts: ${summary}`, {
      endpoint: wavEndpoints.join(", "),
    });
  };

  const queryWavTask = async (taskId: string): Promise<SunoWavQueryResult> => {
    const wavQueryEps = wavQueryEndpoints ?? [
      "https://api.sunoapi.org/api/v1/wav/record-info"
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
          throw new SunoApiError(`Suno WAV query failed with status ${response.status}`, {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
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
          throw new SunoApiError("Suno WAV query response did not include status", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        return {
          taskId: resolvedTaskId,
          musicId,
          status,
          wavUrl,
          rawResponse: json,
          endpoint,
          code: typeof code === 'number' ? code : undefined,
          message: typeof message === 'string' ? message : null,
        };
      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno WAV query error", {
              endpoint,
              cause: error,
            });
        errors.push(sunoError);
        logger.error("🔴 [SUNO] WAV query failed", {
          endpoint,
          message: sunoError.message,
          status: sunoError.details.status,
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno WAV query endpoints failed. Attempts: ${summary}`, {
      endpoint: wavQueryEps.join(", "),
    });
  };

  const extendTrack = createExtendTrack(apiKey, fetchImpl);
  const generateCoverImage = createGenerateCoverImage(apiKey, fetchImpl);
  const boostStyle = createBoostStyle(apiKey, fetchImpl);
  const getTimestampedLyrics = createGetTimestampedLyrics(apiKey, fetchImpl);

  return {
    generateTrack,
    generateLyrics,
    queryTask,
    queryLyricsTask,
    requestStemSeparation,
    queryStemTask,
    convertToWav,
    queryWavTask,
    extendTrack,
    generateCoverImage,
    boostStyle,
    getTimestampedLyrics,
  };
};

export type SunoClient = ReturnType<typeof createSunoClient>;
