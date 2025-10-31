# 🚀 Query Optimization Guide

> **Последнее обновление**: 2025-10-31 (Sprint 31 Week 1)  
> **Статус**: ✅ Оптимизировано

## 🎯 Проблема: N+1 Queries

### Что такое N+1 Query Problem?

**N+1** — это антипаттерн, при котором для загрузки N элементов выполняется 1 + N запросов к базе данных.

### Пример проблемы

```typescript
// ❌ ПЛОХО: N+1 запросы
async function loadTracks() {
  // 1. Загрузить список треков
  const tracks = await supabase
    .from('tracks')
    .select('id, title, user_id')
    .eq('user_id', userId);
  // Запрос #1: SELECT * FROM tracks WHERE user_id = ?

  // 2. Для КАЖДОГО трека загрузить дополнительные данные
  for (const track of tracks) {
    // Запрос #2: SELECT * FROM track_versions WHERE track_id = ?
    const versions = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', track.id);
    
    // Запрос #3: SELECT * FROM track_stems WHERE track_id = ?
    const stems = await supabase
      .from('track_stems')
      .select('*')
      .eq('track_id', track.id);
    
    track.versions = versions;
    track.stems = stems;
  }
  
  // Итого: 1 + (N * 2) запросов
  // Для 100 треков: 1 + 200 = 201 запрос! 😱
}
```

### Последствия N+1

| Количество треков | Запросов | Время выполнения | Network overhead |
|-------------------|----------|------------------|------------------|
| **10** | 21 | ~200ms | ~10 KB |
| **50** | 101 | ~1.2s | ~50 KB |
| **100** | **201** | **~2.5s** ⚠️ | **~100 KB** |
| **500** | **1,001** | **~15s** 🔴 | **~500 KB** |

---

## ✅ Решение: JOIN Queries

### Правильный подход

```typescript
// ✅ ХОРОШО: 1 запрос с JOIN
async function loadTracks() {
  const { data: tracks } = await supabase
    .from('tracks')
    .select(`
      *,
      track_versions!parent_track_id (
        id,
        variant_index,
        audio_url,
        is_primary_variant
      ),
      track_stems!track_id (
        id,
        stem_type,
        audio_url
      ),
      track_likes!track_id (
        user_id
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  // Итого: 1 запрос! 🎉
  // Для 100 треков: 1 запрос (~150ms)
}
```

### Результаты оптимизации

| Метрика | До оптимизации | После оптимизации | Улучшение |
|---------|---------------|-------------------|-----------|
| **Запросов** | 201 | 1 | **-99.5%** 🚀 |
| **Время** | ~2.5s | ~150ms | **-94%** ⚡ |
| **Network** | ~100 KB | ~15 KB | **-85%** 📉 |
| **Server Load** | Высокая | Низкая | **-90%** 💚 |

---

## 🏗️ Реализация в Albert3

### Оптимизированный useTracks hook

**Файл**: `src/hooks/useTracks.ts`

```typescript
export const useTracks = (refreshTrigger?: number) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTracks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ Single optimized query with JOINs
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          prompt,
          audio_url,
          cover_url,
          status,
          duration_seconds,
          created_at,
          style_tags,
          lyrics,
          play_count,
          like_count,
          
          track_versions!parent_track_id (
            id,
            variant_index,
            audio_url,
            is_primary_variant,
            is_preferred_variant
          ),
          
          track_stems!track_id (
            id,
            stem_type,
            audio_url,
            separation_mode
          ),
          
          track_likes!track_id (
            user_id,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTracks(data || []);
      
    } catch (error) {
      logError('Failed to load tracks', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks, refreshTrigger]);

  return { tracks, isLoading, refreshTracks: loadTracks };
};
```

---

## 📊 Query Optimization Patterns

### 1. Select только нужные поля

```typescript
// ❌ Плохо: Загружаем все поля
.select('*')

// ✅ Хорошо: Только нужные поля
.select('id, title, audio_url, created_at')

// Экономия: ~40-60% размера payload
```

### 2. Использование foreign key hints

```typescript
// ❌ Плохо: Неявный JOIN (медленный)
.select(`
  *,
  track_versions (*)
`)

// ✅ Хорошо: Явный JOIN через foreign key
.select(`
  *,
  track_versions!parent_track_id (*)
`)

// Ускорение: ~2-3x быстрее
```

### 3. Пагинация для больших списков

```typescript
// ✅ Загружать данные порциями
const PAGE_SIZE = 50;

const { data } = await supabase
  .from('tracks')
  .select('*')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });

// Вместо 1000 треков загружаем только 50
```

### 4. Использование indexes

```sql
-- Создать indexes для часто используемых полей

-- Index для user_id (ускоряет WHERE user_id = ?)
CREATE INDEX idx_tracks_user_id 
  ON tracks(user_id);

-- Composite index для сортировки
CREATE INDEX idx_tracks_user_status 
  ON tracks(user_id, status, created_at DESC);

-- Index для текстового поиска
CREATE INDEX idx_tracks_title_search 
  ON tracks USING gin(to_tsvector('russian', title));

-- Результат: 10-100x ускорение запросов
```

---

## 🔍 Query Performance Monitoring

### Включение SQL logging

```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'albert3-muse-synth-studio',
    },
  },
  // ✅ Enable query logging in development
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Log slow queries
if (import.meta.env.DEV) {
  const originalFrom = supabase.from.bind(supabase);
  supabase.from = (table: string) => {
    const start = performance.now();
    const query = originalFrom(table);
    
    const originalSelect = query.select.bind(query);
    query.select = (...args: any[]) => {
      const result = originalSelect(...args);
      
      result.then(() => {
        const duration = performance.now() - start;
        if (duration > 500) {
          console.warn(`⚠️ Slow query detected: ${table} (${duration.toFixed(2)}ms)`);
        }
      });
      
      return result;
    };
    
    return query;
  };
}
```

### Analyzing query performance

```typescript
// Measure query time
const measureQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    
    console.log(`✅ ${queryName}: ${duration.toFixed(2)}ms`);
    
    // Track в analytics
    analytics.track('query_performance', {
      query: queryName,
      duration,
      timestamp: Date.now(),
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${queryName} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
};

// Использование
const tracks = await measureQuery('loadTracks', async () => {
  return supabase.from('tracks').select('*');
});
```

---

## 📈 Performance Targets

### Query Performance SLA

| Query Type | Target | Warning | Critical |
|------------|--------|---------|----------|
| **Simple SELECT** | < 50ms | > 100ms | > 500ms |
| **JOIN (1 level)** | < 150ms | > 300ms | > 1s |
| **JOIN (2+ levels)** | < 300ms | > 600ms | > 2s |
| **Full-text search** | < 200ms | > 500ms | > 1.5s |
| **Aggregations** | < 500ms | > 1s | > 3s |

### Monitoring Dashboard

```typescript
// src/utils/queryMonitor.ts
export class QueryMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static track(queryName: string, duration: number) {
    const existing = this.metrics.get(queryName) || [];
    existing.push(duration);
    
    // Сохраняем только последние 100 измерений
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(queryName, existing);
  }

  static getStats(queryName: string) {
    const durations = this.metrics.get(queryName) || [];
    if (durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(durations.length * 0.5)],
      p95: sorted[Math.floor(durations.length * 0.95)],
      p99: sorted[Math.floor(durations.length * 0.99)],
      max: sorted[sorted.length - 1],
    };
  }
}
```

---

## 🐛 Common Pitfalls

### 1. Неиспользование индексов

```sql
-- ❌ Плохо: Запрос без индекса
SELECT * FROM tracks WHERE user_id = '123' ORDER BY created_at DESC;
-- Execution time: ~500ms (Full table scan)

-- ✅ Хорошо: С индексом
CREATE INDEX idx_tracks_user_created ON tracks(user_id, created_at DESC);
SELECT * FROM tracks WHERE user_id = '123' ORDER BY created_at DESC;
-- Execution time: ~5ms (Index scan)
```

### 2. SELECT * вместо конкретных полей

```typescript
// ❌ Плохо: Загружаем все поля (включая JSONB metadata)
const { data } = await supabase
  .from('tracks')
  .select('*');  // ~50 KB payload

// ✅ Хорошо: Только нужные поля
const { data } = await supabase
  .from('tracks')
  .select('id, title, audio_url, created_at');  // ~10 KB payload
```

### 3. Множественные запросы в цикле

```typescript
// ❌ Плохо: N запросов
for (const trackId of trackIds) {
  await supabase.from('tracks').select('*').eq('id', trackId).single();
}

// ✅ Хорошо: 1 запрос с IN
const { data } = await supabase
  .from('tracks')
  .select('*')
  .in('id', trackIds);
```

---

## 🔗 Дополнительные ресурсы

- [Supabase Query Performance](https://supabase.com/docs/guides/database/query-performance)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)

---

*Последнее обновление: 2025-10-31*  
*Версия: 1.0.0*  
*Автор: @tech-lead*
