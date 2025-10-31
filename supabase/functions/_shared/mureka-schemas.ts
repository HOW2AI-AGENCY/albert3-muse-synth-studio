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
  id: z.string(),
  clip_id: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  audio_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  video_url: z.string().url().optional(),
  duration: z.number().optional(),
  lyrics: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for wrapped Mureka Music Generation Response
 */
export const MurekaMusicWrappedResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.object({
    task_id: z.string(),
    status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
    clips: z.array(MurekaTrackClipSchema).optional(),
    data: z.array(MurekaTrackClipSchema).optional(), // Some responses use 'data' instead of 'clips'
  }),
});

/**
 * Schema for direct Mureka Music Generation Response
 */
export const MurekaMusicDirectResponseSchema = z.object({
  task_id: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  clips: z.array(MurekaTrackClipSchema).optional(),
  data: z.array(MurekaTrackClipSchema).optional(),
});

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
