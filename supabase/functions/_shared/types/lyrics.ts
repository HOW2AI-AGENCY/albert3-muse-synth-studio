import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Schema for aligned word object from Suno API
 */
export const alignedWordSchema = z.object({
  word: z.string(),
  success: z.boolean().optional().default(true),
  startS: z.number(),
  endS: z.number(),
  palign: z.number().optional().default(0),
});

/**
 * Schema for normalized timestamped lyrics response
 * This is the GUARANTEED output format from this Edge Function
 */
export const timestampedLyricsSchema = z.object({
  alignedWords: z.array(alignedWordSchema),
  waveformData: z.array(z.number()).optional().default([]),
  hootCer: z.number().optional().default(0),
  isStreamed: z.boolean().optional().default(false),
});

/**
 * Schema for Suno API response (multiple possible formats)
 */
export const sunoResponseSchema = z.union([
  z.object({
    code: z.number(),
    msg: z.string(),
    data: timestampedLyricsSchema.nullable(),
  }),
  z.object({
    success: z.boolean(),
    data: timestampedLyricsSchema.nullable(),
  }),
  timestampedLyricsSchema,
  z.object({
    error: z.string(),
    code: z.number().optional(),
  }),
  z.object({}).passthrough(),
]);

export type SunoResponse = z.infer<typeof sunoResponseSchema>;
export type TimestampedLyricsData = z.infer<typeof timestampedLyricsSchema>;
