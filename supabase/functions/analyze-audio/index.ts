import { createAuthenticatedHandler } from "../_shared/handler-factory.ts";
import { analyzeAudioSchema } from "../_shared/zod-schemas.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { replicate } from "../_shared/replicate.ts";
import type { AnalyzeAudioParams } from "../_shared/types/generation.ts";

const REPLICATE_MODEL_VERSION = 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38';
const WEBHOOK_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-callback`;

createAuthenticatedHandler<AnalyzeAudioParams>({
    schema: analyzeAudioSchema,
    rateLimit: 'default',
    handler: async (body, user) => {
        const { audioUrl, trackId, prompt } = body;

        if (!replicate) {
            logger.error('🔴 Replicate client is not initialized. REPLICATE_API_KEY is missing.');
            return new Response(JSON.stringify({ error: 'Replicate service is not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const prediction = await replicate.run(
            `meta/musicgen:${REPLICATE_MODEL_VERSION}`,
            {
                model_version: 'stereo-melody-large',
                description: prompt,
                duration: 8,
            },
            WEBHOOK_URL,
        );

        const supabase = createSupabaseAdminClient();
        const { error: updateError } = await supabase
            .from('tracks')
            .update({
                status: 'processing',
                metadata: {
                    replicate_prediction_id: prediction.id,
                    replicate_model_version: REPLICATE_MODEL_VERSION,
                },
            })
            .eq('id', trackId)
            .eq('user_id', user.id);

        if (updateError) {
            logger.error('🔴 Failed to update track with prediction ID', { trackId, predictionId: prediction.id, error: updateError });
        }

        logger.info('✅ Replicate task started successfully', { trackId, predictionId: prediction.id });

        return new Response(JSON.stringify({ success: true, predictionId: prediction.id }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
