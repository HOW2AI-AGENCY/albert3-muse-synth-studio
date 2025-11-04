// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { id: predictionId, status, output } = payload;

    if (!predictionId) {
      logger.warn('🔴 Replicate callback called without prediction ID', { payload });
      return new Response(JSON.stringify({ error: 'Missing prediction ID' }), { status: 400 });
    }

    logger.info(`🔔 Received Replicate callback for prediction ${predictionId}`, { status });

    const supabase = createSupabaseAdminClient();

    // Найти трек по ID задачи Replicate в метаданных
    const { data: track, error: findError } = await supabase
      .from('tracks')
      .select('id, metadata')
      .eq('metadata->>replicate_prediction_id', predictionId)
      .maybeSingle();

    if (findError) {
      logger.error('🔴 DB error finding track by prediction ID', { predictionId, error: findError.message });
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }

    if (!track) {
      logger.warn('🟡 No track found for this prediction ID. Maybe it was deleted?', { predictionId });
      // Возвращаем 200, чтобы Replicate не повторял вызов
      return new Response(JSON.stringify({ message: 'No track found' }), { status: 200 });
    }

    // Обработка результата
    if (status === 'succeeded') {
      const existingMetadata = (track.metadata as Record<string, any>) || {};

      // ❗ ВАЖНО: Структура `output` зависит от используемой модели.
      // Этот код нужно будет адаптировать под реальный вывод модели.
      const analysisResult = {
        bpm: output?.bpm,
        key: output?.key,
        genre: output?.genre,
        mood: output?.mood,
        transcription: output?.transcription,
      };

      const { error: updateError } = await supabase
        .from('tracks')
        .update({
          status: 'completed', // Или другой статус, если анализ - это не завершение
          metadata: {
            ...existingMetadata,
            replicate_output: analysisResult,
            replicate_status: 'succeeded',
          },
        })
        .eq('id', track.id);

      if (updateError) {
        logger.error('🔴 Failed to update track with Replicate results', { trackId: track.id, error: updateError.message });
        return new Response(JSON.stringify({ error: 'Failed to update track' }), { status: 500 });
      }

      logger.info('✅ Track updated successfully with Replicate analysis', { trackId: track.id });

    } else if (status === 'failed' || status === 'canceled') {
      const { error: failureReason } = payload;
      await supabase
        .from('tracks')
        .update({
          status: 'failed',
          error_message: `Replicate analysis failed: ${failureReason || 'Unknown error'}`,
        })
        .eq('id', track.id);

      logger.warn(`🔴 Replicate prediction ${status}`, { predictionId, trackId: track.id, error: failureReason });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('🔴 Fatal error in replicate-callback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
});
