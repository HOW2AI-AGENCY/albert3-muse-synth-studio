// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';
import { replicate } from '../_shared/replicate.ts';

// ❗ ВАЖНО: Укажите здесь актуальную версию модели Replicate для анализа аудио
const REPLICATE_MODEL_VERSION = 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38';

// URL для вебхука, который Replicate вызовет по завершении
const WEBHOOK_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-callback`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 🔐 Аутентификация пользователя (КРИТИЧЕСКИ ВАЖНО)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    // Проверка токена и получение пользователя
    const supabase = createSupabaseAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logger.error('🔴 Authentication failed in analyze-audio', { error: userError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('✅ User authenticated in analyze-audio', { userId: user.id });

    // 2. Валидация входных данных
    const { audioUrl, trackId, prompt } = await req.json();
    if (!audioUrl || !trackId) {
      return new Response(JSON.stringify({ error: 'audioUrl and trackId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Проверка наличия клиента Replicate
    if (!replicate) {
      logger.error('🔴 Replicate client is not initialized. REPLICATE_API_KEY is missing.');
      return new Response(JSON.stringify({ error: 'Replicate service is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Запуск задачи в Replicate
    const prediction = await replicate.run(
      `meta/musicgen:${REPLICATE_MODEL_VERSION}`,
      {
        model_version: 'stereo-melody-large',
        description: prompt,
        duration: 8,
      },
      WEBHOOK_URL, // Отправляем результат на наш вебхук
    );

    // 5. Сохранение ID задачи от Replicate в метаданные трека
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        status: 'processing', // Обновляем статус
        metadata: {
          replicate_prediction_id: prediction.id,
          replicate_model_version: REPLICATE_MODEL_VERSION,
        },
      })
      .eq('id', trackId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('🔴 Failed to update track with prediction ID', { trackId, predictionId: prediction.id, error: updateError.message });
      // Не прерываем выполнение, т.к. задача уже запущена, но логируем ошибку
    }

    logger.info('✅ Replicate task started successfully', { trackId, predictionId: prediction.id });

    // 6. Возвращаем клиенту ID задачи
    return new Response(JSON.stringify({ success: true, predictionId: prediction.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('🔴 Fatal error in analyze-audio', {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
