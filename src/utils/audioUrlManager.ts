/**
 * Audio URL Manager - управление Supabase Storage URLs с истечением срока
 * 
 * Проблема: Supabase Storage генерирует signed URLs с ограниченным сроком действия (обычно 60 минут).
 * После истечения срока аудио перестает воспроизводиться (403 Forbidden).
 * 
 * Решение:
 * 1. Проверка срока действия URL перед воспроизведением
 * 2. Автоматическое обновление истекших URL через getPublicUrl()
 * 3. Обновление URL в базе данных для других пользователей
 * 
 * @module audioUrlManager
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const REFRESH_THRESHOLD_MINUTES = 10; // Обновлять URL за 10 минут до истечения

export interface UrlCheckResult {
  isValid: boolean;
  needsRefresh: boolean;
  newUrl?: string;
  expiresAt?: Date;
}

/**
 * Извлечение параметров из Supabase Storage URL
 */
function parseStorageUrl(url: string): {
  bucket: string;
  path: string;
  token?: string;
  expiresAt?: number;
} | null {
  try {
    const urlObj = new URL(url);
    
    // Формат: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    // или: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?token=...
    const pathParts = urlObj.pathname.split('/storage/v1/object/');
    if (pathParts.length < 2) return null;

    const [, rest] = pathParts;
    const segments = rest.split('/');
    
    const isPublic = segments[0] === 'public';
    const isSigned = segments[0] === 'sign';
    
    if (!isPublic && !isSigned) return null;

    const bucket = segments[1];
    const path = segments.slice(2).join('/');
    
    // Извлечение токена и времени истечения из query params
    const token = urlObj.searchParams.get('token') || undefined;
    const expiresParam = urlObj.searchParams.get('exp');
    const expiresAt = expiresParam ? parseInt(expiresParam, 10) : undefined;

    return { bucket, path, token, expiresAt };
  } catch (error) {
    logger.error('Failed to parse storage URL', error instanceof Error ? error : new Error(String(error)), 'audioUrlManager', { url });
    return null;
  }
}

/**
 * Проверка срока действия URL и необходимости обновления
 */
export async function checkAudioUrl(url: string): Promise<UrlCheckResult> {
  const context = 'audioUrlManager.checkAudioUrl';
  
  if (!url) {
    return { isValid: false, needsRefresh: true };
  }

  const parsed = parseStorageUrl(url);
  if (!parsed) {
    logger.warn('Invalid storage URL format', context, { url });
    return { isValid: false, needsRefresh: true };
  }

  // Проверка срока действия
  if (parsed.expiresAt) {
    const now = Date.now() / 1000; // Unix timestamp в секундах
    const expiresDate = new Date(parsed.expiresAt * 1000);
    const minutesUntilExpiry = (parsed.expiresAt - now) / 60;

    logger.debug('URL expiry check', context, {
      expiresAt: expiresDate.toISOString(),
      minutesUntilExpiry: Math.round(minutesUntilExpiry),
    });

    // URL истек
    if (now >= parsed.expiresAt) {
      logger.warn('URL has expired', context, {
        url,
        expiresAt: expiresDate.toISOString(),
      });
      return { isValid: false, needsRefresh: true, expiresAt: expiresDate };
    }

    // URL скоро истечет
    if (minutesUntilExpiry < REFRESH_THRESHOLD_MINUTES) {
      logger.info('URL will expire soon', context, {
        minutesUntilExpiry: Math.round(minutesUntilExpiry),
      });
      return { isValid: true, needsRefresh: true, expiresAt: expiresDate };
    }

    return { isValid: true, needsRefresh: false, expiresAt: expiresDate };
  }

  // Public URL (без expiry) - всегда валиден
  return { isValid: true, needsRefresh: false };
}

/**
 * Обновление URL трека в базе данных
 */
async function refreshTrackAudioUrl(trackId: string, bucket: string, path: string): Promise<string | null> {
  const context = 'audioUrlManager.refreshTrackAudioUrl';
  
  try {
    // Получить новый public URL (без истечения для публичных bucket)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    
    if (!data?.publicUrl) {
      logger.error('Failed to get new public URL', new Error('No URL returned'), context, { bucket, path });
      return null;
    }

    const newUrl = data.publicUrl;
    logger.info('Generated new audio URL', context, { trackId, newUrl });

    // Обновить URL в базе данных
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ audio_url: newUrl })
      .eq('id', trackId);

    if (updateError) {
      logger.error('Failed to update track audio_url', updateError, context, { trackId });
      return newUrl; // Вернуть URL даже если обновление БД не удалось
    }

    logger.info('Track audio_url updated successfully', context, { trackId });
    return newUrl;
  } catch (error) {
    logger.error('Error refreshing track audio URL', error instanceof Error ? error : new Error(String(error)), context, { trackId });
    return null;
  }
}

/**
 * Обновление URL версии трека в базе данных
 */
async function refreshVersionAudioUrl(versionId: string, bucket: string, path: string): Promise<string | null> {
  const context = 'audioUrlManager.refreshVersionAudioUrl';
  
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    
    if (!data?.publicUrl) {
      logger.error('Failed to get new public URL', new Error('No URL returned'), context, { bucket, path });
      return null;
    }

    const newUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from('track_versions')
      .update({ audio_url: newUrl })
      .eq('id', versionId);

    if (updateError) {
      logger.error('Failed to update version audio_url', updateError, context, { versionId });
      return newUrl;
    }

    logger.info('Version audio_url updated successfully', context, { versionId });
    return newUrl;
  } catch (error) {
    logger.error('Error refreshing version audio URL', error instanceof Error ? error : new Error(String(error)), context, { versionId });
    return null;
  }
}

/**
 * Получение свежего URL для воспроизведения
 * 
 * @param url - Текущий URL
 * @param trackId - ID трека (для обновления в БД)
 * @param versionId - ID версии трека (опционально, для версий)
 * @returns Новый URL или null если не удалось обновить
 */
export async function getValidAudioUrl(
  url: string,
  trackId: string,
  versionId?: string
): Promise<string | null> {
  const context = 'audioUrlManager.getValidAudioUrl';
  
  const checkResult = await checkAudioUrl(url);

  // URL валиден и не требует обновления
  if (checkResult.isValid && !checkResult.needsRefresh) {
    return url;
  }

  logger.info('Refreshing audio URL', context, {
    trackId,
    versionId,
    reason: !checkResult.isValid ? 'expired' : 'will_expire_soon',
  });

  // Парсинг URL для извлечения bucket и path
  const parsed = parseStorageUrl(url);
  if (!parsed) {
    logger.error('Cannot refresh URL - invalid format', new Error('Invalid URL'), context, { url });
    return null;
  }

  // Обновление в зависимости от типа (трек или версия)
  if (versionId) {
    return await refreshVersionAudioUrl(versionId, parsed.bucket, parsed.path);
  } else {
    return await refreshTrackAudioUrl(trackId, parsed.bucket, parsed.path);
  }
}

/**
 * Предварительная проверка и обновление URL перед воспроизведением
 * Использовать в AudioPlayerContext перед началом воспроизведения
 */
export async function ensureValidAudioUrl(
  currentUrl: string,
  trackId: string,
  versionId?: string
): Promise<{ url: string; wasRefreshed: boolean }> {
  const context = 'audioUrlManager.ensureValidAudioUrl';
  
  try {
    const newUrl = await getValidAudioUrl(currentUrl, trackId, versionId);
    
    if (newUrl && newUrl !== currentUrl) {
      logger.info('Audio URL was refreshed', context, { trackId, versionId });
      return { url: newUrl, wasRefreshed: true };
    }

    return { url: currentUrl, wasRefreshed: false };
  } catch (error) {
    logger.error('Error ensuring valid audio URL', error instanceof Error ? error : new Error(String(error)), context, { trackId });
    return { url: currentUrl, wasRefreshed: false };
  }
}
