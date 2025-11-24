import { createAuthenticatedHandler } from "../_shared/handler-factory.ts";
import { generateSunoSchema } from "../_shared/zod-schemas.ts";
import { SunoGenerationHandler } from "./handler.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import type { SunoGenerationParams } from "../_shared/types/generation.ts";
import { sanitizePrompt, sanitizeLyrics, sanitizeTitle, sanitizeStyleTags } from "../_shared/sanitization.ts";

createAuthenticatedHandler<SunoGenerationParams>({
    schema: generateSunoSchema,
    rateLimit: 'generation',
    handler: async (rawBody, user) => {
        const body = rawBody;
        const params: SunoGenerationParams = {
            trackId: body.trackId,
            title: body.title ? sanitizeTitle(body.title) : undefined,
            prompt: sanitizePrompt(body.prompt || ''),
            lyrics: body.lyrics ? sanitizeLyrics(body.lyrics) : undefined,
            styleTags: body.styleTags
                ? (Array.isArray(body.styleTags)
                    ? body.styleTags.map((t: string) => t.trim())
                    : (typeof body.styleTags === 'string' ? sanitizeStyleTags(body.styleTags).split(',').map((t: string) => t.trim()) : [])
                )
                : undefined,
            hasVocals: body.hasVocals,
            modelVersion: body.modelVersion,
            idempotencyKey: body.idempotencyKey,
            make_instrumental: body.make_instrumental,
            wait_audio: body.wait_audio,
            customMode: body.customMode,
            negativeTags: body.negativeTags ? sanitizeStyleTags(body.negativeTags) : undefined,
            vocalGender: body.vocalGender,
            styleWeight: body.styleWeight,
            weirdnessConstraint: body.weirdnessConstraint,
            audioWeight: body.audioWeight,
            referenceAudioUrl: body.referenceAudioUrl,
            referenceTrackId: body.referenceTrackId,
        };

        const supabaseAdmin = createSupabaseAdminClient();
        const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
        if (!SUNO_API_KEY) {
            throw new Error('SUNO_API_KEY not configured');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const normalisedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : null;
        const callbackUrlEnv = Deno.env.get('SUNO_CALLBACK_URL')?.trim();
        const callbackUrl = callbackUrlEnv && callbackUrlEnv.length > 0
            ? callbackUrlEnv
            : normalisedSupabaseUrl
                ? `${normalisedSupabaseUrl}/functions/v1/suno-callback`
                : null;

        const handler = new SunoGenerationHandler(supabaseAdmin, user.id, SUNO_API_KEY, callbackUrl);

        logger.info('🎵 Starting Suno generation', { userId: user.id, trackId: params.trackId });

        const result = await handler.generate(params);

        return new Response(
            JSON.stringify(result),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
});
