import { z } from "zod";
import { logger } from "@/utils/logger";

// Environment variables are loaded from .env.production as fallback in all modes
// This is configured in vite.config.ts to ensure Lovable Cloud preview builds
// have access to production credentials without requiring manual env var setup
const rawEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  suggestionsApiUrl: import.meta.env.VITE_SUGGESTIONS_API_URL,
  appEnv: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

const envSchema = z.object({
  supabaseUrl: z
    .string({ message: "VITE_SUPABASE_URL is required" })
    .url("VITE_SUPABASE_URL must be a valid URL"),
  supabaseAnonKey: z
    .string({ message: "VITE_SUPABASE_PUBLISHABLE_KEY is required" })
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY cannot be empty"),
  suggestionsApiUrl: z
    .string()
    .url("VITE_SUGGESTIONS_API_URL must be a valid URL")
    .optional(),
  appEnv: z
    .enum(["development", "production", "test", "staging"])
    .optional()
    .transform((value) => value ?? "development"),
  isDevelopment: z.boolean(),
  isProduction: z.boolean(),
});

const result = envSchema.safeParse(rawEnv);

let envData: z.infer<typeof envSchema>;

if (result.success) {
  envData = result.data;
} else {
  const formattedErrors = Object.entries(result.error.flatten().fieldErrors)
    .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
    .join("\n");

  // В dev-режиме не падаем: предупреждаем и подставляем безопасные значения
  if (rawEnv.isDevelopment) {
    logger.warn(
      `Environment validation failed in development. Using safe defaults.\n${formattedErrors}`,
      'env-config'
    );
    envData = {
      supabaseUrl: "https://localhost.invalid",
      supabaseAnonKey: "dev-placeholder-key",
      suggestionsApiUrl: undefined,
      appEnv: "development",
      isDevelopment: true,
      isProduction: false,
    };
  } else {
    throw new Error(`Environment validation failed:\n${formattedErrors}`);
  }
}

export const appEnv = {
  supabaseUrl: envData.supabaseUrl,
  supabaseAnonKey: envData.supabaseAnonKey,
  suggestionsApiUrl: envData.suggestionsApiUrl,
  appEnv: envData.appEnv,
  isDevelopment: envData.isDevelopment,
  isProduction: envData.isProduction,
};

export type AppEnvironment = typeof appEnv;
