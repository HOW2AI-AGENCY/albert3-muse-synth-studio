import type {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  PostgrestError,
} from "@supabase/supabase-js";

import { logError } from "@/utils/logger";

export type SupabaseFunctionError =
  | FunctionsHttpError
  | FunctionsFetchError
  | FunctionsRelayError;

interface ApiErrorOptions {
  context?: string;
  payload?: Record<string, unknown>;
  cause?: unknown;
}

export class ApiError extends Error {
  public readonly context?: string;
  public readonly payload?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.context = options.context;
    this.payload = options.payload;
    this.cause = options.cause;
  }
}

export const handlePostgrestError = (
  error: PostgrestError | null,
  fallbackMessage: string,
  context: string,
  payload?: Record<string, unknown>
) => {
  if (!error) {
    return;
  }

  logError(fallbackMessage, new Error(error.message), context, {
    ...payload,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  throw new ApiError(fallbackMessage, {
    context,
    payload: {
      ...payload,
      details: error.details,
      hint: error.hint,
      code: error.code,
    },
    cause: error,
  });
};

export const ensureData = <T>(
  data: T | null,
  fallbackMessage: string,
  context: string,
  payload?: Record<string, unknown>
): T => {
  if (data === null) {
    logError(fallbackMessage, undefined, context, payload);
    throw new ApiError(fallbackMessage, { context, payload });
  }

  return data;
};

export const handleSupabaseFunctionError = (
  error: SupabaseFunctionError | null,
  fallbackMessage: string,
  context: string,
  payload?: Record<string, unknown>
): never => {
  if (error) {
    logError(fallbackMessage, error instanceof Error ? error : new Error(error.message), context, {
      ...payload,
      status: "status" in error ? error.status : undefined,
    });

    throw new ApiError(error.message || fallbackMessage, {
      context,
      payload: {
        ...payload,
        status: "status" in error ? error.status : undefined,
      },
      cause: error,
    });
  }

  logError(fallbackMessage, undefined, context, payload);
  throw new ApiError(fallbackMessage, { context, payload });
};
