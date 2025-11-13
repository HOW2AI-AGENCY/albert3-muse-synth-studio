# 🔍 Аудит бага версионирования треков

**Дата**: 13 ноября 2025
**Статус**: ✅ Причина найдена
**Приоритет**: 🔴 P0 (критический)

---

## 📋 Описание проблемы

**Симптом**: Система версионирования показывает только одну версию трека вместо двух.

**Ожидаемое поведение**: Если у трека есть 2 версии, должны отображаться обе.

**Фактическое поведение**: Отображается только одна версия.

---

## 🔎 Анализ кода

### 1. Проблема в `MinimalVersionsList.tsx`

#### Проблема #1: Отсутствует фильтр версий (строки 24-37)

```typescript
const { data: versions = [], isLoading } = useQuery({
  queryKey: ["track-versions-minimal", trackId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("track_versions")
      .select("*")
      .eq("parent_track_id", trackId)
      .order("variant_index", { ascending: true });
      // ❌ ПРОБЛЕМА: Нет фильтра .gte('variant_index', 1)

    if (error) throw error;
    return data || [];
  },
  enabled: !!trackId,
});
```

**Последствие**: Загружаются ВСЕ версии из `track_versions`, включая возможные записи с `variant_index = 0`, что создает дубликаты.

#### Проблема #2: Искусственное ограничение отображения (строки 76-84)

```typescript
const displayVersions = useMemo(() => {
  if (allVersions.length <= 2) return allVersions;
  const hasMain = Boolean(mainTrack);
  if (hasMain) {
    const last = versions[versions.length - 1];
    return [allVersions[0], last]; // ❌ ПРОБЛЕМА: показывает только 2 версии!
  }
  return allVersions.slice(0, 2);
}, [allVersions, mainTrack, versions]);
```

**Последствие**: Даже если версий больше 2, отображаются только основная + последняя, пропуская промежуточные.

---

## 📊 Сравнение с правильной реализацией

### ✅ Правильно (из `trackVersions.ts:364-371`)

```typescript
// Load variants (ONLY variant_index >= 1)
const { data: dbVersions, error: versionsError } = await supabase
  .from('track_versions')
  .select('*, suno_id')
  .eq('parent_track_id', trackId)
  .gte('variant_index', 1) // ✅ CRITICAL: Only load variants >= 1
  .order('variant_index', { ascending: true })
  .returns<TrackVersionRow[]>();
```

### ❌ Неправильно (текущая реализация в `MinimalVersionsList.tsx`)

```typescript
const { data, error } = await supabase
  .from("track_versions")
  .select("*")
  .eq("parent_track_id", trackId)
  .order("variant_index", { ascending: true });
  // ❌ Нет фильтра .gte('variant_index', 1)
```

---

## 🧩 Архитектурный контекст

### Правильная модель данных (из `VERSIONING_SYSTEM.md`)

```
Main Track (tracks table):
- id: primary key
- audio_url: main version audio
- variant_index: NULL (not applicable)

Variants (track_versions table):
- id: primary key
- parent_track_id: foreign key → tracks.id
- variant_index: 1, 2, 3... (ALWAYS >= 1)
- is_preferred_variant: boolean
```

**Ключевое правило**:
> "Store variants in `track_versions` with `variant_index >= 1`"
> "Do NOT duplicate main track in `track_versions`"

---

## 🐛 Сценарии проявления бага

### Сценарий 1: Трек с 2 вариантами

**База данных:**
```
tracks:
  id: track-123
  audio_url: "main.mp3"

track_versions:
  - id: v1, parent_track_id: track-123, variant_index: 1
  - id: v2, parent_track_id: track-123, variant_index: 2
```

**Текущее поведение:**
1. `versions` загружает: [v1, v2]
2. `allVersions` создает: [mainTrack, v1, v2] (3 версии)
3. `displayVersions` показывает: [mainTrack, v2] (пропускает v1!)

**Результат**: Пользователь видит "Основная" и "V2", но не видит "V1" ❌

### Сценарий 2: Трек с дубликатом в track_versions

**База данных (если есть ошибка в данных):**
```
tracks:
  id: track-123
  audio_url: "main.mp3"

track_versions:
  - id: v0, parent_track_id: track-123, variant_index: 0 (дубликат!)
  - id: v1, parent_track_id: track-123, variant_index: 1
```

**Текущее поведение:**
1. `versions` загружает: [v0, v1]
2. `allVersions` создает: [mainTrack, v0, v1] (3 версии, v0 - дубликат!)
3. `displayVersions` показывает: [mainTrack, v1] (показывает дубликат как основную)

**Результат**: Дублирование основного трека ❌

---

## 🔧 Решение

### Изменение 1: Добавить фильтр variant_index >= 1

```typescript
const { data: versions = [], isLoading } = useQuery({
  queryKey: ["track-versions-minimal", trackId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("track_versions")
      .select("*")
      .eq("parent_track_id", trackId)
      .gte("variant_index", 1) // ✅ FIX: Only load variants >= 1
      .order("variant_index", { ascending: true });

    if (error) throw error;
    return data || [];
  },
  enabled: !!trackId,
});
```

### Изменение 2: Показывать все версии

```typescript
// ✅ FIX: Show ALL versions, not just 2
const displayVersions = useMemo(() => {
  return allVersions;
}, [allVersions]);
```

**Обоснование**: Компонент называется "MinimalVersionsList", но это не означает, что нужно скрывать версии. Минимализм должен быть в дизайне, а не в функциональности.

---

## 📝 Дополнительные проверки

### Проверка 1: Консистентность полей

В `useTracks.ts:85` загружается:
```typescript
is_primary_variant,
is_preferred_variant
```

В `TrackVersions.tsx:116-117,140-141,171-173`:
```typescript
if (version.is_primary_variant) { /* ... */ }
if (version.is_preferred_variant) { /* ... */ }
const additionalVersions = versions.filter(v => !v.is_primary_variant);
```

**Статус**: ✅ Используются оба поля корректно

### Проверка 2: API consistency

- `trackVersions.ts:369`: `.gte('variant_index', 1)` ✅
- `MinimalVersionsList.tsx:30`: Нет фильтра ❌
- `TrackVersions.tsx`: Полагается на входные данные (нужно проверять источник)

---

## ✅ План исправления

1. ✅ **Провести аудит** - выявить проблему (ВЫПОЛНЕНО)
2. 🔄 **Исправить MinimalVersionsList.tsx** (В ПРОЦЕССЕ):
   - Добавить фильтр `.gte('variant_index', 1)`
   - Убрать ограничение `displayVersions` на 2 версии
3. ⏳ **Проверить другие компоненты** - убедиться, что нет аналогичных проблем
4. ⏳ **Написать тесты** - предотвратить регрессию
5. ⏳ **Закоммитить и запушить изменения**

---

## 🎯 Влияние исправления

### До исправления:
- ❌ Показывается только 1 версия вместо 2
- ❌ Промежуточные версии скрываются
- ❌ Возможны дубликаты при некорректных данных

### После исправления:
- ✅ Все версии отображаются корректно
- ✅ Нет дубликатов основного трека
- ✅ Соответствие архитектурной документации
- ✅ Консистентность с другими компонентами

---

## 📚 Связанные файлы

- `src/features/tracks/ui/MinimalVersionsList.tsx` - **ТРЕБУЕТ ИСПРАВЛЕНИЯ**
- `src/features/tracks/api/trackVersions.ts` - ✅ Эталонная реализация
- `src/features/tracks/components/TrackVersions.tsx` - ✅ Правильная реализация
- `src/hooks/useTracks.ts` - ✅ Корректная загрузка полей
- `docs/VERSIONING_SYSTEM.md` - Архитектурная документация

---

## 🏷️ Метки

- `P0` - Критический баг
- `version-system` - Система версионирования
- `ui-bug` - Баг пользовательского интерфейса
- `data-filtering` - Фильтрация данных
- `13-nov-2025` - Дата обнаружения
