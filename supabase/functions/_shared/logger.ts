// Sentry is optional - only imported if configured
let Sentry: typeof import("npm:@sentry/node") | null = null;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
  error?: unknown;
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

const sentryDsn = Deno.env.get("SENTRY_EDGE_DSN") ?? Deno.env.get("SENTRY_DSN") ?? "";
const sentryEnvironment = Deno.env.get("SENTRY_ENVIRONMENT") ?? Deno.env.get("ENVIRONMENT") ?? "production";
const sentryRelease = Deno.env.get("SENTRY_RELEASE");
const sentryDebug = Deno.env.get("SENTRY_DEBUG") === "true";
const rawTracesSampleRate = Number(Deno.env.get("SENTRY_TRACES_SAMPLE_RATE") ?? "0");
const sentryFlushTimeoutMs = Number(Deno.env.get("SENTRY_FLUSH_TIMEOUT_MS") ?? "2000");

const isSentryConfigured = sentryDsn.trim().length > 0;
let isSentryInitialised = false;

const initialiseSentry = async () => {
  if (isSentryInitialised || !isSentryConfigured) {
    return;
  }

  try {
    // Dynamically import Sentry only if configured
    const sentryModule = await import("npm:@sentry/node");
    Sentry = sentryModule;

    const tracesSampleRate = Number.isFinite(rawTracesSampleRate)
      ? Math.min(Math.max(rawTracesSampleRate, 0), 1)
      : 0;

    Sentry.init({
      dsn: sentryDsn,
      environment: sentryEnvironment,
      release: sentryRelease,
      tracesSampleRate,
      debug: sentryDebug,
    });

    Sentry.setTag("runtime", "supabase-edge");

    isSentryInitialised = true;
  } catch (error) {
    console.warn("Failed to initialize Sentry:", error);
  }
};

const ensureSentry = async (): Promise<boolean> => {
  if (!isSentryConfigured) {
    return false;
  }

  if (!isSentryInitialised) {
    await initialiseSentry();
  }

  return isSentryInitialised && Sentry !== null;
};

const captureLogWithSentry = async (level: LogLevel, message: string, context?: LogContext, maskedContext?: LogContext) => {
  if (level !== "error") {
    return;
  }

  if (!(await ensureSentry()) || !Sentry) {
    return;
  }

  const errorCandidate = context?.error;
  const error = errorCandidate instanceof Error ? errorCandidate : new Error(message);

  Sentry.captureException(error, (scope) => {
    scope.setLevel("error");
    scope.setTag("edge.logger", "supabase");
    scope.setExtras({
      ...maskedContext,
    });

    if (errorCandidate && !(errorCandidate instanceof Error)) {
      scope.setContext("logger.rawError", { value: errorCandidate });
    }

    if (context) {
      scope.setContext("logger.context", context);
    }

    return scope;
  });
};

export const withSentry = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result | Promise<Result>,
  _options?: { transaction?: string },
) => {
  return async (...args: Args): Promise<Result> => {
    if (!(await ensureSentry()) || !Sentry) {
      return await handler(...args);
    }

    return await Sentry.runWithAsyncContext(async () => {
      const transactionName = _options?.transaction ?? handler.name ?? "edge.function";
      const transaction = Sentry.startTransaction({ name: transactionName, op: "edge.function" });

      Sentry.configureScope((scope) => {
        scope.setTransactionName(transactionName);
        scope.setTag("edge.function", transactionName);
        if (transaction) {
          scope.setSpan(transaction);
        }
      });

      try {
        const result = await handler(...args);
        if (transaction) {
          transaction.setStatus("ok");
        }
        return result;
      } catch (error) {
        Sentry.captureException(error, (scope) => {
          scope.setLevel("error");
          scope.setTag("edge.function", transactionName);
          return scope;
        });
        if (transaction) {
          transaction.setStatus("internal_error");
        }
        throw error;
      } finally {
        if (transaction) {
          transaction.finish();
        }
        await Sentry.flush(sentryFlushTimeoutMs);
      }
    });
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

  // Fire and forget - don't await Sentry to avoid blocking logs
  captureLogWithSentry(level, message, context, maskedContext).catch(() => {});
};

export const logger = {
  error: (message: string, context?: LogContext) => log('error', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
};
