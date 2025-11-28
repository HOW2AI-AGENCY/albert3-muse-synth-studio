import { buildSunoHeaders } from "./suno.utils.ts";

export type SunoBalanceAttempt = {
  endpoint: string;
  status?: number;
  message: string;
};

const unique = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;

    const segments = value.split(",").map((segment) => segment.trim()).filter(Boolean);
    for (const segment of segments) {
      if (!segment) continue;
      const normalised = segment.endsWith("/") ? segment.slice(0, -1) : segment;
      if (!normalised) continue;
      if (!seen.has(normalised)) {
        seen.add(normalised);
        result.push(normalised);
      }
    }
  }
  return result;
};

export const DEFAULT_SUNO_BALANCE_ENDPOINTS = unique([
  Deno.env.get("SUNO_BALANCE_URL"),
  "https://api.sunoapi.org/api/v1/generate/credit",
  "https://api.sunoapi.org/api/v1/account/balance",
  "https://studio-api.suno.ai/api/billing/info/",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value.trim());
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
};

const coerceString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const getNestedValue = (root: Record<string, unknown>, path: string[]): unknown => {
  let current: unknown = root;
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

const pickNumber = (root: Record<string, unknown>, paths: string[][]): number | undefined => {
  for (const path of paths) {
    const value = getNestedValue(root, path);
    const numeric = coerceNumber(value);
    if (numeric !== undefined) {
      return numeric;
    }
  }
  return undefined;
};

const pickString = (root: Record<string, unknown>, paths: string[][]): string | undefined => {
  for (const path of paths) {
    const value = getNestedValue(root, path);
    const stringValue = coerceString(value);
    if (stringValue) {
      return stringValue;
    }
  }
  return undefined;
};

export const parseSunoBalanceResponse = (body: unknown): {
  balance: number;
  currency?: string;
  plan?: string;
  monthly_limit?: number;
  monthly_usage?: number;
} => {
  if (!isRecord(body)) {
    throw new Error("Unexpected response format");
  }

  const code = coerceNumber(body.code) ?? coerceNumber(body.status);
  const successMessage = coerceString(body.msg) ?? coerceString(body.message) ?? undefined;
  if (code !== undefined && code !== 200 && code !== 0) {
    throw new Error(successMessage ? `${successMessage} (code ${code})` : `Suno responded with code ${code}`);
  }

  const successFlag = (body as Record<string, unknown>).success ?? (body as Record<string, unknown>).ok ?? undefined;
  if (typeof successFlag === "boolean" && successFlag === false) {
    throw new Error(successMessage ?? "Suno balance request failed");
  }
  if (typeof successFlag === "string" && successFlag.toLowerCase() === "false") {
    throw new Error(successMessage ?? "Suno balance request failed");
  }

  const balancePaths: string[][] = [
    ["balance"],
    ["data", "balance"],
    ["data", "data", "balance"],
    ["data"],
    ["data", "remaining"],
    ["data", "remaining_creations"],
    ["data", "credit_balance"],
    ["remaining_creations"],
    ["remainingCredits"],
    ["credits", "balance"],
    ["credits", "remaining"],
    ["credits", "remaining_creations"],
    ["credits", "monthly", "remaining"],
    ["credits", "monthly", "remaining_creations"],
    ["usage", "remaining"],
    ["billing", "remaining"],
    ["data", "credits", "balance"],
    ["data", "credits", "remaining"],
    ["data", "usage", "remaining"],
    ["monthly_remaining"],
  ];

  const monthlyLimitPaths: string[][] = [
    ["monthly_limit"],
    ["data", "monthly_limit"],
    ["data", "data", "monthly_limit"],
    ["credits", "monthly_limit"],
    ["credits", "monthly", "limit"],
    ["subscription", "monthly_limit"],
    ["limits", "monthly"],
    ["usage", "limit"],
    ["data", "credits", "monthly", "limit"],
  ];

  const monthlyUsagePaths: string[][] = [
    ["monthly_usage"],
    ["data", "monthly_usage"],
    ["data", "data", "monthly_usage"],
    ["credits", "monthly_usage"],
    ["credits", "monthly", "used"],
    ["credits", "monthly", "usage"],
    ["usage", "monthly"],
    ["usage", "used"],
    ["data", "credits", "monthly", "used"],
  ];

  const balance = pickNumber(body, balancePaths);
  const monthlyLimit = pickNumber(body, monthlyLimitPaths);
  const monthlyUsage = pickNumber(body, monthlyUsagePaths);

  let resolvedBalance = balance;
  if (resolvedBalance === undefined && monthlyLimit !== undefined && monthlyUsage !== undefined) {
    resolvedBalance = Math.max(0, monthlyLimit - monthlyUsage);
  }

  if (resolvedBalance === undefined) {
    throw new Error("Balance value missing in response");
  }

  const currency = pickString(body, [
    ["currency"],
    ["data", "currency"],
    ["data", "data", "currency"],
    ["credits", "currency"],
  ]);

  const plan = pickString(body, [
    ["plan"],
    ["data", "plan"],
    ["subscription", "plan"],
    ["subscription", "name"],
    ["data", "subscription", "plan"],
  ]);

  return {
    balance: resolvedBalance,
    currency,
    plan,
    monthly_limit: monthlyLimit,
    monthly_usage: monthlyUsage,
  };
};

export interface FetchSunoBalanceOptions {
  apiKey: string;
  endpoints?: string[];
  fetchImpl?: typeof fetch;
}

export type FetchSunoBalanceResult =
  | ({
    success: true;
    endpoint: string;
    balance: number;
    currency?: string;
    plan?: string;
    monthly_limit?: number;
    monthly_usage?: number;
  } & { attempts: SunoBalanceAttempt[] })
  | ({ success: false; error: string; attempts: SunoBalanceAttempt[] });

export const fetchSunoBalance = async (
  options: FetchSunoBalanceOptions,
): Promise<FetchSunoBalanceResult> => {
  const { apiKey, endpoints = DEFAULT_SUNO_BALANCE_ENDPOINTS, fetchImpl = fetch } = options;
  const attempts: SunoBalanceAttempt[] = [];

  for (const endpoint of endpoints) {
    let status: number | undefined;
    let rawText = "";
    try {
      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers: buildSunoHeaders(apiKey),
      });

      status = response.status;
      rawText = await response.text();

      let parsedBody: unknown = null;
      if (rawText) {
        try {
          parsedBody = JSON.parse(rawText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${(parseError as Error).message}`);
        }
      }

      if (!response.ok) {
        const errorMessage = isRecord(parsedBody)
          ? (coerceString(parsedBody.msg) ?? coerceString(parsedBody.message))
          : undefined;
        throw new Error(errorMessage ? `${errorMessage} (HTTP ${response.status})` : `HTTP ${response.status}`);
      }

      const parsed = parseSunoBalanceResponse(parsedBody);
      const successAttempt: SunoBalanceAttempt = { endpoint, status, message: "ok" };
      attempts.push(successAttempt);

      return {
        success: true,
        endpoint,
        balance: parsed.balance,
        currency: parsed.currency,
        plan: parsed.plan,
        monthly_limit: parsed.monthly_limit,
        monthly_usage: parsed.monthly_usage,
        attempts,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push({ endpoint, status, message });
    }
  }

  const summary = attempts.length
    ? attempts.map((attempt) => `${attempt.endpoint}: ${attempt.message}`).join("; ")
    : "No Suno balance endpoints configured";

  return {
    success: false,
    error: `All Suno balance endpoints failed. ${summary}`,
    attempts,
  };
};
