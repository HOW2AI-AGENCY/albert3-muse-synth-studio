import { z } from "zod";

const rawEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  appEnv: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

const envSchema = z.object({
  supabaseUrl: z
    .string({ required_error: "VITE_SUPABASE_URL is required" })
    .url("VITE_SUPABASE_URL must be a valid URL"),
  supabaseAnonKey: z
    .string({ required_error: "VITE_SUPABASE_PUBLISHABLE_KEY is required" })
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY cannot be empty"),
  appEnv: z
    .enum(["development", "production", "test", "staging"])
    .optional()
    .transform((value) => value ?? "development"),
  isDevelopment: z.boolean(),
  isProduction: z.boolean(),
});

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const formattedErrors = Object.entries(parsed.error.flatten().fieldErrors)
    .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
    .join("\n");

  throw new Error(`Environment validation failed:\n${formattedErrors}`);
}

export const appEnv = {
  supabaseUrl: parsed.data.supabaseUrl,
  supabaseAnonKey: parsed.data.supabaseAnonKey,
  appEnv: parsed.data.appEnv,
  isDevelopment: parsed.data.isDevelopment,
  isProduction: parsed.data.isProduction,
};

export type AppEnvironment = typeof appEnv;
