/**
 * @fileoverview Mureka API Response Schemas & Validators
 * @description Zod schemas for type-safe Mureka API response validation
 * @version 1.0.0
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// LYRICS GENERATION SCHEMAS
// ============================================================================

/**
 * Schema for single lyrics variant
 */
export const MurekaLyricsVariantSchema = z.object({
  text: z.string().min(1, "Lyrics text cannot be empty"),
  title: z.string().optional(),
  status: z.enum(["complete", "failed", "pending"]).optional(),
  errorMessage: z.string().optional(),
});

/**
 * Schema for wrapped Mureka Lyrics Response (code + msg + data)
 */
export const MurekaLyricsWrappedResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.object({
    task_id: z.string().optional(),
    data: z.array(MurekaLyricsVariantSchema).optional(),
  }),
});

/**
 * Schema for direct Mureka Lyrics Response (no wrapping)
 */
export const MurekaLyricsDirectResponseSchema = z.object({
  task_id: z.string().optional(),
  lyrics: z.string().optional(),
  data: z.array(MurekaLyricsVariantSchema).optional(),
});

/**
 * Union schema for all possible Mureka Lyrics responses
 */
export const MurekaLyricsResponseSchema = z.union([
  MurekaLyricsWrappedResponseSchema,
  MurekaLyricsDirectResponseSchema,
]);

// ============================================================================
// MUSIC GENERATION SCHEMAS
// ============================================================================

/**
 * Schema for single generated track clip
 */
export const MurekaTrackClipSchema = z.object({
  id: z.string().optional(), // ✅ FIX: Make ID optional for parsing flexibility
  clip_id: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(), // ✅ FIX: Don't validate URL format to avoid parsing errors
  audio_url: z.string().optional(),
  image_url: z.string().optional(),
  cover_url: z.string().optional(),
  video_url: z.string().optional(),
  flac_url: z.string().optional(),
  duration: z.number().optional(),
  lyrics: z.string().optional(),
  lyrics_sections: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
  finished_at: z.number().optional(),
  model: z.string().optional(),
  index: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough(); // ✅ FIX: Allow extra fields

/**
 * Schema for wrapped Mureka Music Generation Response (API v7)
 */
export const MurekaMusicWrappedResponseSchema = z.object({
  code: z.number().optional(), // ✅ FIX: Make optional for partial responses
  msg: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
    task_id: z.string().optional(),
    status: z.enum([
      "pending", "processing", "completed", "failed", 
      "preparing", "queued", "running", "streaming", 
      "succeeded", "timeouted", "cancelled"
    ]).optional(),
    clips: z.array(MurekaTrackClipSchema).optional(),
    data: z.array(MurekaTrackClipSchema).optional(),
    choices: z.array(MurekaTrackClipSchema).optional(),
  }).passthrough().optional(), // ✅ FIX: Allow extra fields and make data optional
}).passthrough(); // ✅ FIX: Allow extra fields at top level

/**
 * Schema for direct Mureka Music Generation Response (API v7)
 */
export const MurekaMusicDirectResponseSchema = z.object({
  id: z.string().optional(),
  task_id: z.string().optional(),
  status: z.enum([
    "pending", "processing", "completed", "failed", 
    "preparing", "queued", "running", "streaming", 
    "succeeded", "timeouted", "cancelled"
  ]).optional(),
  clips: z.array(MurekaTrackClipSchema).optional(),
  data: z.array(MurekaTrackClipSchema).optional(),
  choices: z.array(MurekaTrackClipSchema).optional(),
}).passthrough(); // ✅ FIX: Allow extra fields

/**
 * Union schema for all possible Mureka Music responses
 */
export const MurekaMusicResponseSchema = z.union([
  MurekaMusicWrappedResponseSchema,
  MurekaMusicDirectResponseSchema,
]);

// ============================================================================
// BALANCE SCHEMAS
// ============================================================================

export const MurekaBalanceResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.object({
    balance: z.number(),
    currency: z.string(),
    total_spent: z.number().optional(),
    last_topped_up: z.string().optional(),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MurekaLyricsVariant = z.infer<typeof MurekaLyricsVariantSchema>;
export type MurekaLyricsWrappedResponse = z.infer<typeof MurekaLyricsWrappedResponseSchema>;
export type MurekaLyricsDirectResponse = z.infer<typeof MurekaLyricsDirectResponseSchema>;
export type MurekaLyricsResponse = z.infer<typeof MurekaLyricsResponseSchema>;

export type MurekaTrackClip = z.infer<typeof MurekaTrackClipSchema>;
export type MurekaMusicWrappedResponse = z.infer<typeof MurekaMusicWrappedResponseSchema>;
export type MurekaMusicDirectResponse = z.infer<typeof MurekaMusicDirectResponseSchema>;
export type MurekaMusicResponse = z.infer<typeof MurekaMusicResponseSchema>;

export type MurekaBalanceResponse = z.infer<typeof MurekaBalanceResponseSchema>;
