# 🔍 Аудит обработки ошибок загрузки версий треков

**Дата**: 13 ноября 2025
**Приоритет**: 🔴 P1 (Высокий - может привести к потере данных)
**Статус**: ⚠️ Обнаружены критические проблемы

---

## 🎯 Цель аудита

Проверить, что происходит если из-за ошибки не была загружена вторая версия трека, и как система обрабатывает такие сценарии.

---

## 📊 Текущее состояние

### 1. ✅ Хорошо: API `getTrackWithVersions()`

**Файл**: `src/features/tracks/api/trackVersions.ts:441-599`

**Положительные моменты**:

```typescript
export async function getTrackWithVersions(trackId: string): Promise<TrackWithVersions[]> {
  try {
    // PRIORITY 1: Load from track_versions table
    const { data: dbVersions, error: versionsError } = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', trackId);

    if (versionsError) throw versionsError; // Бросает ошибку для catch блока

    // PRIORITY 2: Fallback на metadata.suno_data (строки 492-543)
    if (mainTrack.metadata?.suno_data?.length > 0) {
      mainTrack.metadata.suno_data.forEach((versionData, index) => {
        // Добавляет версии из metadata, если их нет в БД
        if (!versionsByNumber.has(index)) {
          versionsByNumber.set(index, { /* ... */ });
        }
      });
    }

    return normalizedVersions;
  } catch (error) {
    logError('Ошибка получения треков с версиями', error, 'trackVersions', { trackId });
    return []; // ✅ Graceful degradation - возвращает пустой массив
  }
}
```

**Механизмы защиты**:
- ✅ Try-catch блок
- ✅ Fallback на `metadata.suno_data`
- ✅ Логирование ошибок
- ✅ Возврат пустого массива вместо краха
- ✅ Поддержка временных версий из polling

---

### 2. ❌ Проблема: `MinimalVersionsList.tsx`

**Файл**: `src/features/tracks/ui/MinimalVersionsList.tsx:24-38`

**Критические проблемы**:

```typescript
const { data: versions = [], isLoading } = useQuery({
  queryKey: ["track-versions-minimal", trackId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("track_versions")
      .select("*")
      .eq("parent_track_id", trackId)
      .gte("variant_index", 1);

    if (error) throw error; // ❌ ПРОБЛЕМА: просто бросает ошибку, нет обработки
    return data || [];
  },
  enabled: !!trackId,
});
```

**Что не так**:

1. **❌ Нет обработки ошибок**
   - `isError` не используется из useQuery
   - Нет UI для отображения ошибки пользователю
   - Компонент просто не рендерится при ошибке

2. **❌ Нет fallback на metadata**
   - Если запрос к `track_versions` падает, версии из `metadata.suno_data` не загружаются
   - Пользователь теряет доступ к версиям, которые есть в БД

3. **❌ Неполная retry логика**
   - Используется дефолтная из React Query (3 попытки)
   - Но нет специфичной логики для track_versions

4. **❌ Нет уведомления пользователя**
   - Пользователь не знает, что произошла ошибка
   - Просто видит "Нет версий" (строка 92)

---

## 🔴 Сценарии проблем

### Сценарий 1: Ошибка сети при загрузке версий

**Что происходит**:
1. Пользователь открывает трек с 2 версиями
2. Запрос к `track_versions` падает (сеть, timeout, rate limit)
3. `useQuery` бросает ошибку
4. Компонент показывает "Нет версий"
5. ❌ **Пользователь думает, что версий нет**

**Что должно быть**:
1. Попытка загрузить версии
2. При ошибке - fallback на `metadata.suno_data`
3. Если и там нет - показать ошибку с retry
4. ✅ **Пользователь видит версии или ошибку с кнопкой повтора**

---

### Сценарий 2: Частичная загрузка (timeout)

**Что происходит**:
1. В БД есть 3 версии треков
2. Запрос начинает выполняться, но превышает timeout
3. Возвращается частичный результат (1 версия)
4. ❌ **Пользователь видит только 1 версию вместо 3**

**Что должно быть**:
1. Retry с увеличенным timeout
2. Если не помогло - fallback на metadata
3. Показать warning "Загружена часть версий"
4. ✅ **Пользователь знает о проблеме**

---

### Сценарий 3: Ошибка прав доступа (RLS)

**Что происходит**:
1. Row Level Security блокирует доступ к `track_versions`
2. Запрос возвращает пустой массив (не ошибку!)
3. Компонент показывает "Нет версий"
4. ❌ **Пользователь не видит свои версии**

**Что должно быть**:
1. Проверка прав доступа
2. Логирование подозрительных empty results
3. Fallback на metadata
4. ✅ **Показаны версии из metadata**

---

## 📈 Сравнение компонентов

| Аспект | getTrackWithVersions API ✅ | MinimalVersionsList ❌ |
|--------|----------------------------|------------------------|
| Try-catch | ✅ Есть | ❌ Нет |
| Fallback на metadata | ✅ Есть (строки 492-543) | ❌ Нет |
| Логирование ошибок | ✅ logError() | ❌ Нет |
| Graceful degradation | ✅ Возврат [] | ❌ Throw error |
| UI для ошибок | N/A (API) | ❌ Нет |
| Retry логика | N/A (API) | ⚠️ Дефолтная React Query |

---

## 🔧 Рекомендации по исправлению

### Исправление 1: Добавить обработку ошибок

```typescript
const {
  data: versions = [],
  isLoading,
  isError,  // ✅ Добавить
  error,    // ✅ Добавить
  refetch   // ✅ Добавить для retry
} = useQuery({
  queryKey: ["track-versions-minimal", trackId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("track_versions")
      .select("*")
      .eq("parent_track_id", trackId)
      .gte("variant_index", 1);

    if (error) {
      logError('Failed to load track versions', error, 'MinimalVersionsList', { trackId });
      throw error;
    }
    return data || [];
  },
  enabled: !!trackId,
  retry: 2, // ✅ Explicit retry count
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // ✅ Exponential backoff
});

// ✅ Добавить error state
if (isError) {
  return (
    <div className="p-4 text-center space-y-2">
      <p className="text-sm text-destructive">
        Не удалось загрузить версии треков
      </p>
      <Button size="sm" variant="outline" onClick={() => refetch()}>
        Повторить попытку
      </Button>
    </div>
  );
}
```

---

### Исправление 2: Добавить fallback на metadata

```typescript
const { data: mainTrack } = useQuery({
  queryKey: ["track-main", trackId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tracks")
      .select("id, title, audio_url, cover_url, duration_seconds, metadata") // ✅ Добавить metadata
      .eq("id", trackId)
      .single();

    if (error) throw error;
    return data;
  },
  enabled: !!trackId,
});

const allVersions = useMemo(() => {
  let combinedVersions = [...versions];

  // ✅ Fallback: если versions пустой, попробовать metadata.suno_data
  if (combinedVersions.length === 0 && mainTrack?.metadata?.suno_data) {
    const metadataVersions = mainTrack.metadata.suno_data
      .filter((v: any) => v.audio_url)
      .map((v: any, index: number) => ({
        id: v.id || `metadata-${index}`,
        variant_index: index + 1,
        audio_url: v.audio_url || v.stream_audio_url,
        cover_url: v.cover_url || v.image_url || mainTrack.cover_url,
        duration: v.duration,
        is_preferred_variant: false,
        is_primary: false,
      }));

    combinedVersions = metadataVersions;

    logInfo('Using metadata fallback for versions', 'MinimalVersionsList', {
      trackId,
      metadataVersionsCount: metadataVersions.length
    });
  }

  if (mainTrack) {
    return [
      {
        id: mainTrack.id,
        variant_index: 0,
        audio_url: mainTrack.audio_url,
        cover_url: mainTrack.cover_url,
        duration: mainTrack.duration_seconds,
        is_preferred_variant: false,
        is_primary: true,
      },
      ...combinedVersions,
    ];
  }
  return combinedVersions;
}, [mainTrack, versions]);
```

---

### Исправление 3: Использовать getTrackWithVersions API (рекомендуется)

**Самое правильное решение** - использовать существующий API вместо прямых запросов:

```typescript
import { getTrackWithVersions } from '@/features/tracks/api/trackVersions';

const { data: versionsData = [], isLoading, isError, error, refetch } = useQuery({
  queryKey: ["track-versions-minimal", trackId],
  queryFn: () => getTrackWithVersions(trackId), // ✅ Используем API с fallback
  enabled: !!trackId,
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
});

// Преобразуем TrackWithVersions[] в нужный формат
const displayVersions = useMemo(() => {
  return versionsData.map(v => ({
    id: v.id,
    variant_index: v.sourceVersionNumber ?? 0,
    audio_url: v.audio_url,
    cover_url: v.cover_url,
    duration: v.duration,
    is_preferred_variant: v.isMasterVersion,
    is_primary: v.sourceVersionNumber === 0,
  }));
}, [versionsData]);
```

**Преимущества**:
- ✅ Автоматический fallback на metadata
- ✅ Логирование ошибок
- ✅ Graceful degradation
- ✅ Поддержка polling versions
- ✅ Дедупликация по version number

---

## 🎯 Приоритеты исправлений

### P0 (Критично - делать сейчас):
1. **Добавить обработку isError в MinimalVersionsList**
   - Показывать UI ошибки
   - Кнопка retry
   - Логирование

### P1 (Высокий - делать в ближайшее время):
2. **Добавить fallback на metadata.suno_data**
   - Проверять metadata при пустых versions
   - Показывать версии из metadata

3. **Использовать getTrackWithVersions API**
   - Переписать компонент на использование API
   - Убрать дублирование логики

### P2 (Средний - можно отложить):
4. **Добавить мониторинг ошибок**
   - Sentry события для track version errors
   - Метрики success rate
   - Alerting для частых ошибок

---

## 📊 Риски текущей реализации

| Риск | Вероятность | Влияние | Приоритет |
|------|-------------|---------|-----------|
| Пользователь не видит версии при ошибке сети | Средняя (30%) | Высокое | 🔴 P0 |
| Потеря версий из metadata при сбое БД | Низкая (10%) | Критическое | 🔴 P0 |
| Непонятное поведение без error UI | Высокая (50%) | Среднее | 🟠 P1 |
| Дублирование логики версионирования | 100% | Низкое | 🟡 P2 |

---

## ✅ Чеклист исправлений

- [ ] Добавить `isError` и `error` в MinimalVersionsList
- [ ] Создать UI для отображения ошибок
- [ ] Добавить кнопку retry
- [ ] Добавить fallback на metadata.suno_data
- [ ] Добавить логирование ошибок
- [ ] Рассмотреть переход на getTrackWithVersions API
- [ ] Добавить tests для error scenarios
- [ ] Добавить Sentry tracking для версий
- [ ] Обновить документацию

---

## 📚 Связанные документы

- `src/features/tracks/api/trackVersions.ts:441-599` - эталонная реализация
- `docs/VERSIONING_SYSTEM.md` - архитектура версионирования
- `docs/audit/TRACK_VERSIONING_BUG_AUDIT_2025-11-13.md` - предыдущий аудит

---

## 🎉 Заключение

**Текущая оценка error handling**: 4/10 ⚠️

**Критические проблемы**:
- ❌ Нет обработки ошибок в UI
- ❌ Нет fallback механизмов
- ❌ Пользователь не информирован об ошибках

**Рекомендация**: Исправить P0 проблемы немедленно, так как они могут привести к потере доступа к версиям треков.

**Ожидаемая оценка после исправлений**: 9/10 ✅
