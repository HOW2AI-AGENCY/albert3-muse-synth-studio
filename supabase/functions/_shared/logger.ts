import * as Sentry from "@sentry/deno";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
  error?: unknown;
}

const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
const SENTRY_ENVIRONMENT = Deno.env.get("SENTRY_ENVIRONMENT") ?? Deno.env.get("SUPABASE_ENVIRONMENT") ?? "development";
const SENTRY_RELEASE = Deno.env.get("SENTRY_RELEASE");
const configuredSampleRate = Number(Deno.env.get("SENTRY_TRACES_SAMPLE_RATE") ?? "0");
const tracesSampleRate = Number.isFinite(configuredSampleRate)
  ? Math.min(Math.max(configuredSampleRate, 0), 1)
  : 0;
const isSentryEnabled = Boolean(SENTRY_DSN);

if (isSentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN!,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate,
  });
}

const sensitiveKeywords = ["token", "key", "secret", "password", "authorization", "cookie", "credential"];

const maskString = (value: string): string => {
  if (value.length <= 6) {
    return `${value[0] ?? "*"}***${value[value.length - 1] ?? "*"}`;
  }

  const start = value.slice(0, 3);
  const end = value.slice(-2);
  return `${start}***${end}`;
};

const maskValue = (value: unknown, keyPath: string[] = []): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) => maskValue(item, [...keyPath, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [nestedKey, nestedValue]) => {
      acc[nestedKey] = maskValue(nestedValue, [...keyPath, nestedKey]);
      return acc;
    }, {});
  }

  const lastKey = keyPath[keyPath.length - 1]?.toLowerCase() ?? "";
  const shouldMask = sensitiveKeywords.some((keyword) => lastKey.includes(keyword));

  if (shouldMask) {
    if (typeof value === "string") {
      return maskString(value);
    }

    if (typeof value === "number") {
      return "***";
    }

    if (typeof value === "boolean") {
      return value;
    }

    return value === null || value === undefined ? value : "***";
  }

  return value;
};

const maskContext = (context?: LogContext): LogContext | undefined => {
  if (!context) {
    return undefined;
  }

  const { error, ...rest } = context;
  const maskedRest = maskValue(rest) as Record<string, unknown>;

  return error ? { ...maskedRest, error } : maskedRest;
};

const errorReplacer = (_key: string, value: unknown) => {
  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
    };
  }
  return value;
};

const captureSentryException = (message: string, context?: LogContext) => {
  if (!isSentryEnabled) {
    return;
  }

  const errorCandidate = context?.error instanceof Error
    ? context.error
    : new Error(message);

  const maskedContext = maskContext(context);

  Sentry.captureException(errorCandidate, (scope) => {
    scope.setLevel("error");
    scope.setContext("logger", {
      message,
      context: maskedContext,
      timestamp: new Date().toISOString(),
    });

    if (maskedContext) {
      scope.setExtras(maskedContext);
    }

    return scope;
  });
};

export const withSentry = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result | Promise<Result>,
  options?: { transaction?: string },
) => {
  return async (...args: Args): Promise<Result> => {
    try {
      return await handler(...args);
    } catch (error) {
      captureSentryException(`Unhandled exception in ${options?.transaction ?? "edge-function"}`, { error });
      throw error;
    }
  };
};

const log = (level: LogLevel, message: string, context?: LogContext) => {
  const maskedContext = maskContext(context);
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (maskedContext && Object.keys(maskedContext).length > 0) {
    payload.context = maskedContext;
  }

  const text = JSON.stringify(payload, errorReplacer);

  switch (level) {
    case 'error':
      console.error(text);
      captureSentryException(message, context);
      break;
    case 'warn':
      console.warn(text);
      break;
    case 'info':
      console.info(text);
      break;
    default:
      console.debug(text);
  }
};

export const logger = {
  error: (message: string, context?: LogContext) => log('error', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
};
