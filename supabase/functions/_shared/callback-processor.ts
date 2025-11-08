import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logger } from "./logger.ts";
import { downloadAndUploadAudio, downloadAndUploadCover } from "./storage.ts";
import { MemoryCache } from "./cache.ts";
import type { SunoCallbackPayload, SunoCallbackMusicData, CallbackType } from "./types/callbacks.ts";

// Кэш версий трека: хранит массив вариантов по taskId/trackId с TTL 30 минут
const versionsCache = new MemoryCache<SunoCallbackMusicData[]>(1800);

export interface ProcessCallbackResult {
  ok: boolean;
  trackId?: string;
  userId?: string;
  stage?: CallbackType;
  cached?: boolean;
  error?: string;
}

/**
 * Универсальный обработчик Suno callback:
 * - Немедленно делает доступной первую версию для воспроизведения (stream_audio_url или audio_url)
 * - Параллельно загружает все версии в Supabase Storage (фоновые задачи)
 * - Кеширует версии для ускорения повторных запросов
 * - На COMPLETE финализирует трек и записывает стабильные ссылки из Storage
 */
export async function processSunoCallback(
  supabase: SupabaseClient,
  payload: SunoCallbackPayload,
): Promise<ProcessCallbackResult> {
  const { code, msg, data: callbackData } = payload || ({} as SunoCallbackPayload);
  const { task_id: taskId, callbackType, data: musicData } = callbackData || {};

  if (!taskId) {
    logger.error('[CALLBACK-PROCESSOR] Missing taskId');
    return { ok: false, error: 'missing_task_id' };
  }

  // Найти трек по suno_id = taskId
  const { data: track, error: findError } = await supabase
    .from('tracks')
    .select('id, user_id, status, audio_url, cover_url, metadata')
    .eq('suno_id', taskId)
    .maybeSingle();

  if (findError) {
    logger.error('[CALLBACK-PROCESSOR] DB error while locating track', { error: findError, taskId });
    return { ok: false, error: 'db_error_find' };
  }

  if (!track) {
    // Возвращаем 202 в вызывающей функции, здесь просто сообщаем, что трек не найден
    logger.warn('[CALLBACK-PROCESSOR] No track found for taskId', { taskId });
    return { ok: false, error: 'track_not_found' };
  }

  const trackId = track.id as string;
  const userId = track.user_id as string;

  // Если провайдер сообщает ошибку на этапе колбэка — отметим трек как failed и вернём stage=error
  if ((code && code >= 400) || callbackType === 'error') {
    await supabase
      .from('tracks')
      .update({
        status: 'failed',
        metadata: {
          ...(track.metadata || {}),
          suno_callback_stage: callbackType,
          suno_last_callback_code: code,
          suno_last_callback_msg: msg,
          error: 'suno_callback_error',
        },
      })
      .eq('id', trackId);

    logger.warn('[CALLBACK-PROCESSOR] Callback reported error; track marked failed', { trackId, code, msg, stage: callbackType });
    return { ok: true, trackId, userId, stage: 'error', cached: false };
  }

  // Кэш: если у нас уже есть версии (например, повторный вызов first), используем их
  const cached = versionsCache.get(taskId);
  if (cached && (!musicData || musicData.length === 0)) {
    logger.info('[CALLBACK-PROCESSOR] Using cached versions', { taskId, count: cached.length });
  }

  const versions: SunoCallbackMusicData[] = (musicData && musicData.length > 0)
    ? musicData
    : (cached || []);

  // Если нет данных версий (ни в кэше, ни в payload) — это ранний текстовый этап
  if (!versions || versions.length === 0) {
    logger.info('[CALLBACK-PROCESSOR] No music data yet (stage)', { stage: callbackType });
    // Можно обновить прогресс в метаданных
    await supabase
      .from('tracks')
      .update({
        metadata: {
          ...(track.metadata || {}),
          suno_callback_stage: callbackType,
          suno_last_callback_code: code,
          suno_last_callback_msg: msg,
        },
      })
      .eq('id', trackId);

    return { ok: true, trackId, userId, stage: callbackType, cached: !!cached };
  }

  // Обновляем кэш версий
  versionsCache.set(taskId, versions, 1800);

  // 1) Немедленное воспроизведение первой доступной версии
  const first = versions[0];
  const immediateAudioUrl = first.stream_audio_url || first.audio_url;
  const immediateCoverUrl = first.image_url;

  if (immediateAudioUrl) {
    await supabase
      .from('tracks')
      .update({
        status: track.status === 'completed' ? 'completed' : 'processing',
        audio_url: immediateAudioUrl,
        cover_url: immediateCoverUrl ?? track.cover_url,
        metadata: {
          ...(track.metadata || {}),
          suno_callback_stage: callbackType,
          suno_last_callback_code: code,
          suno_last_callback_msg: msg,
          suno_data: versions, // сохраняем полный массив версий в метаданных
          immediate_play_ready: true,
        },
      })
      .eq('id', trackId);

    logger.info('[CALLBACK-PROCESSOR] Immediate playback prepared', {
      trackId,
      stage: callbackType,
      audioPreview: immediateAudioUrl.substring(0, 80),
    });
  }

  // 2) Фоновая загрузка всех версий в Supabase Storage
  // Загружаем аудио/обложки параллельно, не блокируя ответ
  Promise.allSettled(
    versions.map(async (v, idx) => {
      const fileBase = idx === 0 ? 'main' : `version-${idx}`;
      const audioSrc = v.audio_url || v.stream_audio_url;
      const coverSrc = v.image_url;

      if (audioSrc) {
        try {
          const storageAudioUrl = await downloadAndUploadAudio(
            audioSrc,
            trackId,
            userId,
            `${fileBase}.mp3`,
            supabase,
          );
          logger.info('[CALLBACK-PROCESSOR] Audio uploaded to storage', { trackId, idx, storageAudioPreview: storageAudioUrl.substring(0, 80) });
          // Опционально: записать версию в таблицу track_versions
          await supabase
            .from('track_versions')
            .upsert({
              track_id: trackId,
              variant_index: idx,
              audio_url: storageAudioUrl,
              cover_url: coverSrc ?? null,
              source_audio_url: audioSrc,
              source_cover_url: coverSrc ?? null,
              source_version_number: idx,
            }, { onConflict: 'track_id,variant_index' });
        } catch (err) {
          logger.warn('[CALLBACK-PROCESSOR] Audio upload failed, keeping original URL', { trackId, idx, err });
        }
      }

      if (coverSrc) {
        try {
          const storageCoverUrl = await downloadAndUploadCover(
            coverSrc,
            trackId,
            userId,
            `${fileBase}-cover.webp`,
            supabase,
          );
          logger.info('[CALLBACK-PROCESSOR] Cover uploaded to storage', { trackId, idx, storageCoverPreview: storageCoverUrl.substring(0, 80) });
        } catch (err) {
          logger.warn('[CALLBACK-PROCESSOR] Cover upload failed, keeping original URL', { trackId, idx, err });
        }
      }
    })
  ).catch(err => {
    logger.error('[CALLBACK-PROCESSOR] Background uploads failed', { trackId, err });
  });

  // 3) На COMPLETE финализируем трек: обновим статус и заменим ссылки, если загружены
  if (callbackType === 'complete') {
    try {
      // Найдём загруженную основную версию (variant_index = 0)
      const { data: mainVersion } = await supabase
        .from('track_versions')
        .select('audio_url, cover_url')
        .eq('track_id', trackId)
        .eq('variant_index', 0)
        .maybeSingle();

      const finalAudio = (mainVersion?.audio_url as string) || immediateAudioUrl || track.audio_url;
      const finalCover = (mainVersion?.cover_url as string) || immediateCoverUrl || track.cover_url;

      await supabase
        .from('tracks')
        .update({
          status: 'completed',
          audio_url: finalAudio,
          cover_url: finalCover,
          metadata: {
            ...(track.metadata || {}),
            completed_at: new Date().toISOString(),
            suno_data: versions,
            immediate_play_ready: true,
          },
        })
        .eq('id', trackId);

      logger.info('[CALLBACK-PROCESSOR] Track finalized on COMPLETE', { trackId });
    } catch (err) {
      logger.error('[CALLBACK-PROCESSOR] Finalization failed', { trackId, err });
    }
  }

  return { ok: true, trackId, userId, stage: callbackType, cached: !!cached };
}