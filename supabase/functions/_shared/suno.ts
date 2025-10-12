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
  instrument: string; // e.g., 'vocal', 'instrumental', 'drums'
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

export interface CreateSunoClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  generateEndpoints?: string[];
  queryEndpoints?: string[];
  stemEndpoints?: string[];
  stemQueryEndpoints?: string[];
  lyricsGenerateEndpoints?: string[];
  lyricsQueryEndpoints?: string[];
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

// ✅ ФАЗА 2.2: Circuit Breaker для Suno API
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
  "https://api.sunoapi.org/api/v1/lyrics/generate",
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

const parseTaskId = (payload: unknown): { taskId?: string; jobId?: string | null } => {
  if (!payload || typeof payload !== "object") {
    import('./logger.ts').then(({ logger }) => {
      logger.warn('Invalid Suno payload type', { type: typeof payload });
    });
    return {};
  }

  const normaliseString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const TASK_ID_KEYS = ["taskId", "task_id", "id"] as const;
  const JOB_ID_KEYS = ["jobId", "job_id"] as const;

  // ✅ ФАЗА 1.2: Попытка извлечь taskId из разных форматов ответа
  const record = payload as Record<string, unknown>;
  
  // Формат 1: Прямой объект с taskId
  for (const key of TASK_ID_KEYS) {
    const candidate = normaliseString(record[key]);
    if (candidate) {
      import('./logger.ts').then(({ logger }) => {
        logger.info('Found taskId directly', { key, taskId: candidate });
      });
      return { taskId: candidate, jobId: normaliseString(record.jobId || record.job_id) ?? null };
    }
  }
  
  // ✅ ИСПРАВЛЕНИЕ: Формат 2a - Объект data (начальный ответ /api/v1/generate)
  if ('data' in record && record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    const result = parseTaskId(record.data);
    if (result.taskId) {
      import('./logger.ts').then(({ logger }) => {
        logger.info('Found taskId in data object');
      });
      return result;
    }
  }
  
  // Формат 2b: Массив с data/results (callback ответы)
  if ('data' in record && Array.isArray(record.data) && record.data.length > 0) {
    const first = record.data[0];
    if (first && typeof first === 'object') {
      const result = parseTaskId(first);
      if (result.taskId) {
        import('./logger.ts').then(({ logger }) => {
          logger.info('Found taskId in data array');
        });
        return result;
      }
    }
  }
  
  // Формат 3: Вложенный объект result/response
  if ('result' in record || 'response' in record) {
    const nested = record.result || record.response;
    if (nested && typeof nested === 'object') {
      const result = parseTaskId(nested);
      if (result.taskId) {
        import('./logger.ts').then(({ logger }) => {
          logger.info('Found taskId in nested object');
        });
        return result;
      }
    }
  }
  
  // ✅ PHASE 1.2 OPTIMIZATION: Removed recursive BFS parsing
  // Suno API always returns deterministic structure, no need for expensive search
  // All taskId/jobId extraction is done in the deterministic section above (lines 303-351)
  
  return {};
};

// This function is no longer needed with the new, simplified API response structure.

// This function is no longer needed with the new, simplified API response structure.

// Helper functions `extractStemContainer` and `parseStemAssets` are no longer needed
// and have been removed. The logic is now simplified and integrated into `queryStemTask`.

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
  } = options;

  if (!apiKey) {
    throw new Error("SUNO_API_KEY is required to create a Suno client");
  }

  const generateTrack = async (payload: SunoGenerationPayload): Promise<SunoGenerationResult> => {
    // ✅ ФАЗА 2.2: Используем circuit breaker
    return await sunoCircuitBreaker.call(async () => {
      const errors: SunoApiError[] = [];
      const MAX_RETRIES = 3;
      const BACKOFF_BASE_MS = 1000;

    // The new API has a single, stable endpoint. We iterate for resilience, but it's less critical.
    for (const endpoint of generateEndpoints) {
      // Retry logic with exponential backoff for 429 errors
      for (let retryAttempt = 0; retryAttempt <= MAX_RETRIES; retryAttempt++) {
        try {
    // ✅ КРИТИЧНОЕ ИСПРАВЛЕНИЕ: Явная трансформация параметров для Suno API
    const apiPayload: Record<string, unknown> = {
      prompt: payload.prompt,
      tags: payload.tags || [],
      title: payload.title,
      instrumental: payload.make_instrumental ?? false, // ← API ожидает "instrumental", а не "make_instrumental"
      model: payload.model || 'V5',
      customMode: payload.customMode ?? false,
    };

    // Добавляем опциональные параметры
    if (payload.callBackUrl) apiPayload.callBackUrl = payload.callBackUrl;
    if (payload.negativeTags) apiPayload.negativeTags = payload.negativeTags;
    if (payload.vocalGender) apiPayload.vocalGender = payload.vocalGender;
    if (payload.styleWeight !== undefined) apiPayload.styleWeight = payload.styleWeight;
    if (payload.weirdnessConstraint !== undefined) apiPayload.weirdnessConstraint = payload.weirdnessConstraint;
    if (payload.audioWeight !== undefined) apiPayload.audioWeight = payload.audioWeight;
    if (payload.referenceAudioUrl) apiPayload.referenceAudioUrl = payload.referenceAudioUrl;

    // Логирование трансформации для отладки
    import('./logger.ts').then(({ logger }) => {
      logger.debug('Suno payload transformation', {
        before: { make_instrumental: payload.make_instrumental },
        after: { instrumental: apiPayload.instrumental },
        hasReference: !!payload.referenceAudioUrl
      });
    });

          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
            body: JSON.stringify(apiPayload),
          });

          const rawText = await response.text();
          const { json, parseError } = safeParseJson(rawText);

          // ✅ ФАЗА 1.1: Полное логирование ответа Suno API
          import('./logger.ts').then(({ logger }) => {
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
          });

          // Handle 429 Rate Limit with exponential backoff
          if (response.status === 429 && retryAttempt < MAX_RETRIES) {
            const backoffMs = BACKOFF_BASE_MS * Math.pow(2, retryAttempt);
            import('./logger.ts').then(({ logger }) => {
              logger.warn(`Suno rate limit hit, retry ${retryAttempt + 1}/${MAX_RETRIES}`, {
                endpoint,
                backoffMs
              });
            });
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue; // Retry same endpoint
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
        // Handle API-level error codes returned with HTTP 200
        if (json && typeof json === 'object' && 'code' in (json as Record<string, unknown>)) {
          const codeVal = Number((json as any).code);
          if (!Number.isNaN(codeVal) && codeVal !== 200) {
            const apiMsg = (json as any).msg || 'Suno API responded with an error';
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
          console.error("🔴 [SUNO] Generation attempt failed", {
            endpoint,
            message: sunoError.message,
            status: sunoError.details.status,
            retryAttempt,
          });
          
          // Don't retry on non-429 errors, move to next endpoint
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

        const { taskId, jobId } = parseTaskId(json);

        if (typeof taskId !== "string" || !taskId) {
          throw new SunoApiError("Suno lyrics response did not include a task identifier", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return { taskId, jobId: jobId ?? null, rawResponse: json, endpoint };
      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno lyrics error", {
            endpoint,
            cause: error,
          });
        errors.push(sunoError);
        console.error("🔴 [SUNO] Lyrics generation attempt failed", {
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

        const data = (json as any)?.data;
        const status = data?.status;
        const tasks = data?.response?.sunoData ?? [];

        if (!status) {
           throw new SunoApiError("Suno query response did not include task status", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        const code = typeof (json as any)?.code === "number" ? (json as any).code : undefined;
        return { status, tasks, rawResponse: json, endpoint: url, code };

      } catch (error) {
        const sunoError = error instanceof SunoApiError
          ? error
          : new SunoApiError((error as Error)?.message ?? "Unknown Suno query error", {
            endpoint: url,
            cause: error,
          });
        errors.push(sunoError);
        console.error("🔴 [SUNO] Query attempt failed", {
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

        const data = (json as any)?.data;
        const status = data?.status;
        const variants = data?.data ?? []; // The variants are in `data.data`
        const resolvedTaskId = data?.taskId ?? taskId;
        const code = (json as any)?.code;

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
        console.error("🔴 [SUNO] Lyrics query attempt failed", {
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

        const data = (json as any)?.data;
        const taskId = data?.taskId;
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
        console.error("🔴 [SUNO] Stem request failed", {
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

        const data = (json as any)?.data;
        const status = data?.successFlag;
        const message = data?.errorMessage ?? (json as any)?.msg;
        const code = (json as any)?.code;
        const resolvedTaskId = data?.taskId ?? taskId;

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
        console.error("🔴 [SUNO] Stem query failed", {
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

  return {
    generateTrack,
    generateLyrics,
    queryTask,
    queryLyricsTask,
    requestStemSeparation,
    queryStemTask,
  };
};

export type SunoClient = ReturnType<typeof createSunoClient>;
