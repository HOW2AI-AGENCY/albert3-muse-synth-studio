/**
 * Centralized Duration Parser
 * Phase 1.1: Унификация логики парсинга длительности треков
 * 
 * Используется в:
 * - suno-callback/index.ts
 * - add-vocals-callback/index.ts  
 * - add-instrumental-callback/index.ts
 */

/**
 * Парсит duration из любого типа данных в число (seconds)
 * @param value - Входное значение (number, string, unknown)
 * @returns Парсенная длительность в секундах (0 если NaN)
 */
export function parseDuration(value: unknown): number {
  // Если уже число - вернуть как есть
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  // Если строка - попробовать parseFloat
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Для всех остальных типов - вернуть 0
  return 0;
}

/**
 * Форматирует длительность в MM:SS формат
 * @param seconds - Длительность в секундах
 * @returns Строка формата "MM:SS"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Валидирует, что duration находится в разумных пределах
 * @param seconds - Длительность в секундах
 * @returns true если валидно (0-600 секунд = 10 минут)
 */
export function isValidDuration(seconds: number): boolean {
  return !isNaN(seconds) && seconds >= 0 && seconds <= 600;
}
