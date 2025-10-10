export interface SunoGenerationPayload {
  prompt?: string;
  tags?: string[];
  title?: string;
  make_instrumental?: boolean;
  model_version?: string;
  wait_audio?: boolean;
  continue_clip_id?: string | null;
  audio_prompt_id?: string | null;
  style?: string | null;
  callBackUrl?: string;
  callbackUrl?: string;
  callback_url?: string;
  lyrics?: string;
  has_vocals?: boolean;
  custom_mode?: boolean;
}

export interface SunoLyricsPayload {
  prompt: string;
  callBackUrl: string;
  callbackUrl?: string;
  callback_url?: string;
}

export interface SunoTaskStatus {
  id?: string;
  taskId?: string;
  status?: string;
  msg?: string;
  error?: string;
  audioUrl?: string;
  audio_url?: string;
  stream_audio_url?: string;
  source_stream_audio_url?: string;
  image_url?: string;
  imageUrl?: string;
  image_large_url?: string;
  video_url?: string;
  videoUrl?: string;
  duration?: number;
  duration_seconds?: number;
  lyric?: string | null;
  lyrics?: string | null;
  prompt?: string | null;
  model?: string | null;
  model_name?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

export interface SunoGenerationResult {
  taskId: string;
  jobId?: string | null;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoLyricsGenerationResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoQueryResult {
  tasks: SunoTaskStatus[];
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

export interface SunoLyricsQueryResult {
  taskId: string;
  data: SunoLyricsVariantStatus[];
  status?: string;
  rawResponse: unknown;
  endpoint: string;
  code?: number;
}

export interface SunoStemRequest {
  taskId: string;
  audioId: string;
  separationMode: string;
  callbackUrl: string;
  callback_url?: string;
  callBackUrl?: string;
}

export interface SunoStemResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoStemAsset {
  sourceKey: string;
  url: string;
}

export interface SunoStemQueryResult {
  taskId: string;
  assets: SunoStemAsset[];
  status?: string | null;
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

const unique = (values: (string | undefined | null)[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalised = value.trim();
    if (!normalised) continue;
    const key = normalised.endsWith("/") ? normalised.slice(0, -1) : normalised;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(key);
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
  "https://api.sunoapi.org/api/v1/query",
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

const parseTaskId = (payload: unknown): { taskId?: string; jobId?: string | null } => {
  if (!payload || typeof payload !== "object") return {};
  const data = payload as Record<string, unknown>;

  const tryValue = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value;
      if (typeof value === "object" && value !== null) {
        const nested = value as Record<string, unknown>;
        for (const nestedKey of keys) {
          const nestedValue = nested[nestedKey];
          if (typeof nestedValue === "string" && nestedValue.trim()) {
            return nestedValue;
          }
        }
      }
    }
    return undefined;
  };

  const fromArray = (value: unknown): string | undefined => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === "object") {
          const candidate = (entry as Record<string, unknown>).taskId
            ?? (entry as Record<string, unknown>).task_id
            ?? (entry as Record<string, unknown>).id;
          if (typeof candidate === "string" && candidate.trim()) {
            return candidate;
          }
        }
      }
    }
    return undefined;
  };

  const direct = tryValue("taskId", "task_id", "id");
  if (direct) {
    return { taskId: direct, jobId: tryValue("jobId", "job_id") ?? null };
  }

  if ("data" in data) {
    const rawData = (data as { data?: unknown }).data;
    if (rawData && typeof rawData === "object") {
      const nested = rawData as Record<string, unknown>;
      const nestedCandidate = nested.taskId ?? nested.task_id ?? nested.id;
      if (typeof nestedCandidate === "string" && nestedCandidate.trim()) {
        return {
          taskId: nestedCandidate,
          jobId: typeof nested.jobId === "string" ? nested.jobId : typeof nested.job_id === "string" ? nested.job_id : null,
        };
      }
    }

    const arrayCandidate = fromArray(rawData);
    if (arrayCandidate) {
      return { taskId: arrayCandidate, jobId: null };
    }
  }

  const arrayCandidate = Array.isArray(data) ? fromArray(data) : null;
  if (arrayCandidate) {
    return { taskId: arrayCandidate, jobId: null };
  }

  return {};
};

const parseQueryTasks = (payload: unknown): SunoTaskStatus[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload as SunoTaskStatus[];
  }
  if (typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    if (Array.isArray(data.data)) {
      return data.data as SunoTaskStatus[];
    }
    if (data.data && typeof data.data === "object" && Array.isArray((data.data as Record<string, unknown>).tasks)) {
      return (data.data as { tasks: SunoTaskStatus[] }).tasks;
    }
    if (Array.isArray(data.tasks)) {
      return data.tasks as SunoTaskStatus[];
    }
  }
  return [];
};

const parseLyricsVariants = (payload: unknown): SunoLyricsVariantStatus[] => {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const data = root.data;

  const candidates: unknown[] = [];

  if (Array.isArray(data)) {
    candidates.push(...data);
  }

  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;
    if (Array.isArray(dataObj.data)) {
      candidates.push(...dataObj.data);
    }
    if (dataObj.response && typeof dataObj.response === "object") {
      const responseObj = dataObj.response as Record<string, unknown>;
      if (Array.isArray(responseObj.data)) {
        candidates.push(...responseObj.data);
      }
    }
  }

  const variants: SunoLyricsVariantStatus[] = [];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      variants.push(candidate as SunoLyricsVariantStatus);
    }
  }

  return variants;
};

const extractStemContainer = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const container = value as Record<string, unknown>;

  if (container.vocal_removal_info && typeof container.vocal_removal_info === "object") {
    return container.vocal_removal_info as Record<string, unknown>;
  }

  if (container.vocalRemovalInfo && typeof container.vocalRemovalInfo === "object") {
    return container.vocalRemovalInfo as Record<string, unknown>;
  }

  if (container.response && typeof container.response === "object") {
    return container.response as Record<string, unknown>;
  }

  if (container.data && typeof container.data === "object") {
    return extractStemContainer(container.data);
  }

  return container;
};

const parseStemAssets = (payload: unknown): SunoStemAsset[] => {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  let container: Record<string, unknown> | null = null;

  if (root.data && typeof root.data === "object") {
    container = extractStemContainer(root.data);
  }

  if (!container && root.response && typeof root.response === "object") {
    container = root.response as Record<string, unknown>;
  }

  if (!container) {
    return [];
  }

  const assets: SunoStemAsset[] = [];
  for (const [key, value] of Object.entries(container)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!key.toLowerCase().includes("url")) continue;
    assets.push({ sourceKey: key, url: trimmed });
  }

  return assets;
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
  } = options;

  if (!apiKey) {
    throw new Error("SUNO_API_KEY is required to create a Suno client");
  }

  const generateTrack = async (payload: SunoGenerationPayload): Promise<SunoGenerationResult> => {
    const errors: SunoApiError[] = [];
    const normalizedPayload = (() => {
      const base = dropUndefined({ ...(payload as Record<string, unknown>) });
      delete base.callBackUrl;
      delete base.callbackUrl;
      delete base.callback_url;
      return applyCallbackAliases(base, extractCallbackUrl(payload));
    })();

    for (const endpoint of generateEndpoints) {
      try {
        const response = await fetchImpl(`${endpoint}`, {
          method: "POST",
          headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
          body: JSON.stringify(normalizedPayload),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

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

        const { taskId, jobId } = parseTaskId(json);
        if (!taskId) {
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
        });
      }
    }

    const summary = errors.map(err => `${err.details.endpoint}: ${err.message}`).join("; ");
    throw new SunoApiError(`All Suno generation endpoints failed. Attempts: ${summary}`, {
      endpoint: generateEndpoints.join(", "),
    });
  };

  const generateLyrics = async (payload: SunoLyricsPayload): Promise<SunoLyricsGenerationResult> => {
    const errors: SunoApiError[] = [];
    const normalizedPayload = (() => {
      const base = dropUndefined({ ...(payload as Record<string, unknown>) });
      delete base.callBackUrl;
      delete base.callbackUrl;
      delete base.callback_url;
      return applyCallbackAliases(base, extractCallbackUrl(payload));
    })();

    for (const endpoint of lyricsGenerateEndpoints) {
      try {
        const response = await fetchImpl(`${endpoint}`, {
          method: "POST",
          headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
          body: JSON.stringify(normalizedPayload),
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

        const { taskId } = parseTaskId(json);
        if (!taskId) {
          throw new SunoApiError("Suno lyrics response did not include a task identifier", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return { taskId, rawResponse: json, endpoint };
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

        const tasks = parseQueryTasks(json);
        if (!tasks.length) {
          throw new SunoApiError("Suno query response did not include tasks", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        const code = typeof (json as Record<string, unknown>)?.code === "number"
          ? (json as Record<string, unknown>).code as number
          : undefined;
        return { tasks, rawResponse: json, endpoint: url, code };
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

        const variants = parseLyricsVariants(json);
        if (!variants.length) {
          throw new SunoApiError("Suno lyrics query response did not include variants", {
            endpoint: url,
            status: response.status,
            body: rawText,
          });
        }

        const bodyObj = (json ?? {}) as Record<string, unknown>;
        const dataObj = typeof bodyObj.data === "object" && bodyObj.data !== null
          ? (bodyObj.data as Record<string, unknown>)
          : undefined;
        const status = typeof dataObj?.status === "string" ? dataObj.status : undefined;
        const resolvedTaskId = typeof dataObj?.taskId === "string"
          ? dataObj.taskId
          : typeof dataObj?.task_id === "string"
            ? (dataObj?.task_id as string)
            : taskId;
        const code = typeof bodyObj.code === "number" ? bodyObj.code : undefined;

        return {
          taskId: resolvedTaskId,
          data: variants,
          status,
          rawResponse: json,
          endpoint: url,
          code,
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
    const payload = (() => {
      const base = dropUndefined({
        taskId: input.taskId,
        audioId: input.audioId,
        type: input.separationMode,
      } as Record<string, unknown>);

      return applyCallbackAliases(base, extractCallbackUrl({
        callBackUrl: input.callBackUrl,
        callbackUrl: input.callbackUrl,
        callback_url: input.callback_url,
      }));
    })();

    const errors: SunoApiError[] = [];
    for (const endpoint of stemEndpoints) {
      try {
        const response = await fetchImpl(`${endpoint}`, {
          method: "POST",
          headers: buildSunoHeaders(apiKey, { "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
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

        const { taskId: stemTaskId } = parseTaskId(json);
        if (!stemTaskId) {
          throw new SunoApiError("Suno stem response did not include a task identifier", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return { taskId: stemTaskId, rawResponse: json, endpoint };
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

        const { taskId: parsedTaskId } = parseTaskId(json);
        const assets = parseStemAssets(json);

        let status: string | null = null;
        let message: string | null = null;
        let code: number | undefined = undefined;

        if (json && typeof json === "object") {
          const root = json as Record<string, unknown>;
          if (typeof root.code === "number") {
            code = root.code;
          }
          if (typeof root.msg === "string") {
            message = root.msg;
          } else if (typeof root.message === "string") {
            message = root.message;
          }

          if (root.data && typeof root.data === "object") {
            const dataObj = root.data as Record<string, unknown>;
            if (typeof dataObj.status === "string") {
              status = dataObj.status;
            } else if (typeof dataObj.successFlag === "string") {
              status = dataObj.successFlag;
            }
            if (!message && typeof dataObj.msg === "string") {
              message = dataObj.msg;
            }
          }
        }

        return {
          taskId: parsedTaskId ?? taskId,
          assets,
          status,
          rawResponse: json,
          endpoint: endpoint,
          code,
          message,
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
