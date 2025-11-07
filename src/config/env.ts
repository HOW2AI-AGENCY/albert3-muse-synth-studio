import { z } from "zod";
import { logger } from "@/utils/logger";

const rawEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

  // ✅ FIX: Не падаем в dev-режиме И в Lovable Cloud preview builds
  // Lovable Cloud preview builds работают в production mode, но без env vars
  const isLovablePreview = typeof window !== 'undefined' &&
    (window.location.hostname.includes('lovable.app') ||
     window.location.hostname.includes('lovable.dev'));

  if (rawEnv.isDevelopment || isLovablePreview) {
    logger.warn(
      `Environment validation failed. Using safe defaults.\n${formattedErrors}\n\n` +
      `⚠️  Если вы видите эту ошибку в Lovable Cloud:\n` +
      `   1. Откройте Lovable Dashboard\n` +
      `   2. Settings → Environment Variables\n` +
      `   3. Добавьте: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY\n` +
      `   4. См. docs/LOVABLE_ENV_SETUP.md для деталей`,
      'env-config'
    );
    envData = {
      supabaseUrl: "https://localhost.invalid",
      supabaseAnonKey: "dev-placeholder-key",
      appEnv: rawEnv.isDevelopment ? "development" : "production",
      isDevelopment: rawEnv.isDevelopment,
      isProduction: rawEnv.isProduction,
    };
  } else {
    throw new Error(`Environment validation failed:\n${formattedErrors}`);
  }
}

export const appEnv = {
  supabaseUrl: envData.supabaseUrl,
  supabaseAnonKey: envData.supabaseAnonKey,
  appEnv: envData.appEnv,
  isDevelopment: envData.isDevelopment,
  isProduction: envData.isProduction,
};

export type AppEnvironment = typeof appEnv;
