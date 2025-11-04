/**
 * CacheManager
 * Универсальная in-memory утилита кэширования с TTL и LRU-эвикцией.
 *
 * API, ожидаемый тестами:
 * - constructor(ttl?: number)
 * - set(key, data)
 * - get(key): T | null
 * - clear(): void
 * - evictOldest(maxSize: number): void
 */

export class CacheManager<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    this.ttl = ttl;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Эвиктит самые старые элементы по времени записи, пока размер не станет <= maxSize.
   * Если текущий размер уже <= maxSize, ничего не делает.
   */
  evictOldest(maxSize: number): void {
    if (maxSize < 0) maxSize = 0;

    const currentSize = this.cache.size;
    if (currentSize <= maxSize) return;

    const toEvict = currentSize - maxSize;
    // Сортируем по timestamp (от старых к новым)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (let i = 0; i < toEvict; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }
  }
}