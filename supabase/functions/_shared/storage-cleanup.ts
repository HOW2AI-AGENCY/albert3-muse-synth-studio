/**
 * Утилиты для очистки Supabase Storage от устаревших/осиротевших аудиофайлов
 */

export interface ParsedPath {
  userId: string;
  trackId: string;
  fileName: string;
}

/**
 * Разобрать путь формата: `${userId}/${trackId}/${fileName}`
 */
export function parseStoragePath(path: string): ParsedPath | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 3) return null;
  const [userId, trackId, ...rest] = parts;
  const fileName = rest.join('/');
  if (!userId || !trackId || !fileName) return null;
  return { userId, trackId, fileName };
}

/**
 * Причина удаления файла из хранилища
 */
export type CleanupReason =
  | 'orphan_track'           // Трек отсутствует в БД
  | 'failed_old'             // Трек со статусом failed, файл старше порога
  | 'deleted_track'          // Трек удален пользователем
  | 'retention_expired';     // Истек срок хранения

export interface CleanupDecision {
  delete: boolean;
  reason?: CleanupReason;
}

export interface TrackStatusInfo {
  exists: boolean;
  status?: string;          // 'completed' | 'failed' | 'pending' | 'processing' | ...
  deletedAt?: string | null;
}

/**
 * Принять решение об удалении файла на основе данных
 *
 * @param updatedAt - дата последнего обновления файла (из Storage list)
 * @param now - текущая дата
 * @param retentionDays - общий срок хранения, по умолчанию 90 дней
 * @param track - информация о треке из БД
 * @param failedRetentionDays - срок хранения для failed-треков (по умолчанию 7 дней)
 */
export function decideCleanup(
  updatedAt: string | Date,
  now: Date,
  retentionDays: number,
  track: TrackStatusInfo,
  failedRetentionDays = 7
): CleanupDecision {
  const updated = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const ageMs = now.getTime() - updated.getTime();
  const days = ageMs / (24 * 60 * 60 * 1000);

  // Осиротевший файл (нет трека в БД)
  if (!track.exists) {
    return { delete: true, reason: 'orphan_track' };
  }

  // Удаленный трек
  if (track.deletedAt) {
    return { delete: true, reason: 'deleted_track' };
  }

  // Failed-трек: чистим быстрее
  if (track.status === 'failed' && days >= failedRetentionDays) {
    return { delete: true, reason: 'failed_old' };
  }

  // Общий срок хранения
  if (days >= retentionDays) {
    return { delete: true, reason: 'retention_expired' };
  }

  return { delete: false };
}