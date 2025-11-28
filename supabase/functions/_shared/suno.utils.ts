import { logger } from "./logger.ts";

export const unique = (values: (string | undefined | null)[]): string[] => {
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

export const DEFAULT_GENERATE_ENDPOINTS = unique([
  Deno.env.get("SUNO_GENERATE_URL"),
  "https://api.sunoapi.org/api/v1/generate",
]);

export const DEFAULT_QUERY_ENDPOINTS = unique([
  Deno.env.get("SUNO_QUERY_URL"),
  "https://api.sunoapi.org/api/v1/generate/record-info",
]);

export const DEFAULT_STEM_ENDPOINTS = unique([
  Deno.env.get("SUNO_STEM_URL"),
  "https://api.sunoapi.org/api/v1/vocal-removal/generate",
]);

export const DEFAULT_STEM_QUERY_ENDPOINTS = unique([
  Deno.env.get("SUNO_STEM_QUERY_URL"),
  "https://api.sunoapi.org/api/v1/vocal-removal/record-info",
]);

export const DEFAULT_LYRICS_GENERATE_ENDPOINTS = unique([
  Deno.env.get("SUNO_LYRICS_URL"),
  "https://api.sunoapi.org/api/v1/lyrics",
]);

export const DEFAULT_LYRICS_QUERY_ENDPOINTS = unique([
  Deno.env.get("SUNO_LYRICS_QUERY_URL"),
  "https://api.sunoapi.org/api/v1/lyrics/record-info",
]);

export const appendQueryParam = (base: string, params: Record<string, string>): string => {
  const query = new URLSearchParams(params);
  if (base.includes("{taskId}")) {
    return base.replace("{taskId}", encodeURIComponent(params.taskId));
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${query.toString()}`;
};

export const extractCallbackUrl = (
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

export const applyCallbackAliases = (
  target: Record<string, unknown>,
  callbackUrl: string | undefined,
) => {
  if (!callbackUrl) return target;
  target.callBackUrl = callbackUrl;
  target.callbackUrl = callbackUrl;
  target.callback_url = callbackUrl;
  return target;
};

export const dropUndefined = (input: Record<string, unknown>): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
};

export const safeParseJson = (
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

export const parseTaskId = (payload: unknown): { taskId?: string; jobId?: string | null } => {
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
