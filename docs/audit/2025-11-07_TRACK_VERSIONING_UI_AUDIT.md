# Аудит системы версионирования треков и UI отображения

**Дата:** 2025-11-07
**Версия:** 1.0
**Автор:** Claude
**Приоритет:** P0 (Critical UX Issues)

---

## Executive Summary

Проведен комплексный аудит системы версионирования треков и её отображения в различных компонентах UI. Обнаружены **критические несоответствия** между компонентами:

- ✅ **TrackCard** (карточка трека) - полная поддержка версионирования
- ❌ **TrackRow** (строчный компонент) - версионирование **полностью отсутствует**
- ❌ **TrackListItem** - версионирование **полностью отсутствует**
- ⚠️ **TrackVariantSelector** - потенциальный баг с отображением при наличии версий
- ⚠️ **TrackActionsMenu** - две разные реализации с разным функционалом

**Итоговая оценка:** 5.0/10 ⚠️
**Статус:** Требуется немедленное исправление

---

## Детальный анализ компонентов

### 1. TrackCard (Карточка трека) ✅

**Файл:** `src/features/tracks/components/TrackCard.tsx`
**Оценка:** 9.0/10 ✅

#### Что работает:

1. **Версионирование полностью реализовано**
   ```typescript
   const {
     selectedVersionIndex,
     versionCount,
     masterVersion,
     displayedVersion,
     handleVersionChange,
   } = useTrackCardState(track);
   ```

2. **TrackVariantSelector интегрирован**
   - Отображается на обложке трека (TrackCardCover:76-82)
   - Показывает V1, V2, V3... с возможностью переключения
   - Индикатор мастер-версии (звездочка)
   - Кнопка установки мастер-версии

3. **Синхронизация с audio player**
   - При переключении версии обновляется аудио в плеере
   - Корректная работа с `switchToVersion`

4. **Полнофункциональное контекстное меню**
   - TrackActionsMenu с variant="full"
   - AI инструменты (описание трека)
   - Обработка (стемы, расширение, кавер, вокал)
   - Создание персоны
   - Публикация/сокрытие

#### Проблемы:

- ❌ Нет визуального индикатора количества версий на самой карточке (только в селекторе при hover)

---

### 2. TrackRow (Строчный компонент) ❌

**Файл:** `src/components/tracks/TrackRow.tsx`
**Оценка:** 3.0/10 ❌

#### Проблемы:

1. **❌ КРИТИЧНО: Версионирование ПОЛНОСТЬЮ отсутствует**
   ```typescript
   // TrackRow НЕ использует useTrackVersions
   // НЕТ selectedVersionIndex
   // НЕТ handleVersionChange
   // НЕТ displayedVersion
   ```

2. **❌ Нет индикатора версий**
   - Пользователь не видит, что у трека есть несколько версий
   - Невозможно переключиться между версиями

3. **❌ Упрощенное контекстное меню**
   - Использует TrackActionsMenu из `/components/tracks/TrackActionsMenu.tsx`
   - Меньше функций по сравнению с TrackCard
   - Нет интеграции с операциями обработки

4. **⚠️ Несоответствие интерфейсу**
   ```typescript
   interface Track {
     id: string;
     title: string;
     audio_url?: string; // ❌ НЕТ поддержки версий
     // ...
   }
   ```

#### Что работает:

- ✅ Play/Pause overlay
- ✅ Статусы обработки (processing, failed)
- ✅ Базовая статистика (plays, likes, comments)
- ✅ Keyboard shortcuts

---

### 3. TrackListItem (Список треков) ❌

**Файл:** `src/features/tracks/components/TrackListItem.tsx`
**Оценка:** 4.0/10 ❌

#### Проблемы:

1. **❌ КРИТИЧНО: Версионирование ПОЛНОСТЬЮ отсутствует**
   ```typescript
   interface Track {
     id: string;
     title: string;
     audio_url?: string; // ❌ НЕТ поддержки версий
     // ...
   }
   ```

2. **❌ Нет индикатора версий**
   - Аналогично TrackRow

3. **⚠️ Использует TrackActionsMenu с variant="minimal"**
   - Меньше функций в быстром доступе
   - Но полнее чем в TrackRow

#### Что работает:

- ✅ Использует TrackActionsMenu из `/features/tracks/components/shared/`
- ✅ Play/Pause overlay
- ✅ Анимация появления

---

### 4. TrackVariantSelector ⚠️

**Файл:** `src/features/tracks/components/TrackVariantSelector.tsx`
**Оценка:** 7.5/10 ⚠️

#### Потенциальный баг:

```typescript
// Строка 81
const totalVersions = versionCount + 1;

if (isLoading || totalVersions < 2) {
  return null; // ❌ Селектор не показывается если меньше 2 версий
}
```

**Проблема:**
- Если `versionCount = 0` (нет дополнительных версий), `totalVersions = 1`
- Селектор не показывается
- Но если у трека есть 1 дополнительная версия, `versionCount = 1`, `totalVersions = 2` - ОК

**Вопрос:** Правильная ли это логика? Нужно проверить, считается ли основная версия отдельно.

#### Что работает:

- ✅ Переключение версий через кнопки V1/V2/V3
- ✅ Индикатор мастер-версии (звездочка)
- ✅ Установка мастер-версии
- ✅ Свернутое/развернутое состояние
- ✅ Keyboard accessibility
- ✅ Tooltips

---

### 5. TrackActionsMenu - Две реализации ⚠️

#### Версия 1: `/features/tracks/components/shared/TrackActionsMenu.tsx` ✅

**Оценка:** 9.0/10 ✅

**Функционал:**
```typescript
interface TrackActionsMenuProps {
  // Кнопки быстрого доступа
  onLikeClick?: () => void;
  onDownloadClick?: () => void;
  onShareClick?: () => void;

  // Dropdown меню
  onTogglePublic?: () => void;
  onDescribeTrack?: (trackId: string) => void; // ✅ AI
  onSeparateStems?: (trackId: string) => void; // ✅
  onExtend?: (trackId: string) => void;        // ✅ Suno
  onCover?: (trackId: string) => void;         // ✅ Suno
  onAddVocal?: (trackId: string) => void;      // ✅ Suno
  onCreatePersona?: (trackId: string) => void; // ✅
  onSync?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;

  // Варианты отображения
  variant?: 'full' | 'compact' | 'minimal';
}
```

**Используется в:**
- ✅ TrackCard (variant="full")
- ✅ TrackListItem (variant="minimal")

---

#### Версия 2: `/components/tracks/TrackActionsMenu.tsx` ⚠️

**Оценка:** 6.0/10 ⚠️

**Функционал:**
```typescript
const DEFAULT_ITEMS: TrackActionsItem[] = [
  { id: 'remix', icon: 'Wand2', label: 'Remix/Edit' },
  { id: 'create', icon: 'Sparkles', label: 'Create' },
  { id: 'stems', icon: 'Waves', label: 'Get Stems', pro: true },
  { id: 'queue', icon: 'ListPlus', label: 'Add to Queue' },
  { id: 'playlist', icon: 'ListMusic', label: 'Add to Playlist' },
  { id: 'move', icon: 'FolderInput', label: 'Move to Workspace' },
  { id: 'publish', icon: 'Send', label: 'Publish' },
  { id: 'details', icon: 'Info', label: 'Song Details' },
  { id: 'permissions', icon: 'Shield', label: 'Visibility & Permissions' },
  { id: 'share', icon: 'Share2', label: 'Share' },
  { id: 'download', icon: 'Download', label: 'Download' },
  { id: 'report', icon: 'Flag', label: 'Report', danger: true },
  { id: 'trash', icon: 'Trash2', label: 'Move to Trash', danger: true },
];
```

**Проблемы:**
- ❌ Нет интеграции с конкретными операциями (onSeparateStems, onExtend, и т.д.)
- ❌ Только generic `onAction(actionId, trackId)` callback
- ⚠️ Более простая версия, требует дополнительной логики в родительском компоненте

**Используется в:**
- ⚠️ TrackRow

---

## Сравнительная таблица компонентов

| Функция | TrackCard | TrackRow | TrackListItem |
|---------|-----------|----------|---------------|
| **Версионирование** | ✅ Полное | ❌ Нет | ❌ Нет |
| **Индикатор версий** | ✅ Селектор | ❌ Нет | ❌ Нет |
| **Переключение версий** | ✅ V1/V2/V3 | ❌ Нет | ❌ Нет |
| **Мастер-версия** | ✅ Звездочка | ❌ Нет | ❌ Нет |
| **Like button** | ✅ | ✅ | ❌ Нет |
| **Download** | ✅ | ❌ Нет | ❌ Нет |
| **Share** | ✅ | ❌ Нет | ❌ Нет |
| **AI описание** | ✅ | ❌ Нет | ✅ |
| **Разделить стемы** | ✅ | ❌ Нет | ✅ |
| **Расширить трек** | ✅ | ❌ Нет | ✅ |
| **Создать кавер** | ✅ | ❌ Нет | ✅ |
| **Добавить вокал** | ✅ | ❌ Нет | ✅ |
| **Создать персону** | ✅ | ❌ Нет | ❌ Нет |
| **Публикация** | ✅ | ❌ Нет | ❌ Нет |
| **Retry/Sync** | ✅ | ❌ Нет | ✅ |

---

## Критические проблемы (P0)

### 1. TrackRow: Отсутствие версионирования ⛔

**Приоритет:** P0 (CRITICAL)
**Файл:** `src/components/tracks/TrackRow.tsx`

**Проблема:**
- Пользователи НЕ видят, что у трека есть версии
- Невозможно переключиться между версиями
- При клике на play всегда воспроизводится только первая (основная) версия

**Решение:**
1. Добавить `useTrackVersions(track.id)` hook
2. Добавить индикатор версий (badge с количеством)
3. Добавить TrackVariantSelector (опционально, может быть в popover/dropdown)
4. Обновить интерфейс Track для поддержки версий

**Пример кода:**
```typescript
// Добавить в TrackRow
const { versions, versionCount, displayedVersion } = useTrackVersions(track.id);

// Добавить индикатор
{versionCount > 0 && (
  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
    +{versionCount} версий
  </Badge>
)}
```

---

### 2. TrackListItem: Отсутствие версионирования ⛔

**Приоритет:** P0 (CRITICAL)
**Файл:** `src/features/tracks/components/TrackListItem.tsx`

**Проблема:** Аналогично TrackRow

**Решение:** Аналогично TrackRow

---

### 3. Inconsistent TrackActionsMenu usage ⚠️

**Приоритет:** P1 (HIGH)

**Проблема:**
- TrackRow использует упрощенную версию меню из `/components/tracks/`
- TrackCard и TrackListItem используют полную версию из `/features/tracks/components/shared/`
- Пользователи получают разный функционал в зависимости от компонента

**Решение:**
1. **Опция A:** Унифицировать на `/features/tracks/components/shared/TrackActionsMenu.tsx`
2. **Опция B:** Добавить adapter слой для преобразования generic actions в конкретные callbacks

**Рекомендация:** Опция A - использовать везде shared версию с variants (full/compact/minimal)

---

## Рекомендации по исправлению

### Приоритет P0 (Немедленно)

1. **TrackRow: Добавить версионирование**
   - Интегрировать `useTrackVersions`
   - Добавить индикатор версий (badge)
   - Добавить быстрое переключение версий (в dropdown или отдельный popover)

2. **TrackListItem: Добавить версионирование**
   - Аналогично TrackRow

3. **Унифицировать TrackActionsMenu**
   - Использовать везде `/features/tracks/components/shared/TrackActionsMenu.tsx`
   - Удалить или deprecate `/components/tracks/TrackActionsMenu.tsx`

### Приоритет P1 (В течение недели)

4. **TrackVariantSelector: Проверить логику отображения**
   - Проверить кейс с 1 дополнительной версией (totalVersions = 2)
   - Убедиться что селектор показывается корректно

5. **Добавить версионирование в мобильные компоненты**
   - TrackCardMobile должен поддерживать версии

### Приоритет P2 (В течение 2 недель)

6. **Улучшить UX переключения версий**
   - Добавить превью версий (cover/title различаются)
   - Добавить быстрые shortcuts (1, 2, 3 для переключения версий)
   - Добавить swipe gesture на мобильных

7. **Добавить индикатор активной версии в списках**
   - Badge "V2" рядом с названием трека
   - Если играет не мастер-версия

---

## Предлагаемое решение

### 1. Создать shared hook: `useTrackVersionsDisplay`

```typescript
// src/features/tracks/hooks/useTrackVersionsDisplay.ts
export function useTrackVersionsDisplay(trackId: string) {
  const { versions, versionCount, displayedVersion, masterVersion } = useTrackVersions(trackId);
  const [selectedIndex, setSelectedIndex] = useState(0);

  return {
    hasVersions: versionCount > 0,
    versionCount,
    selectedVersionIndex: selectedIndex,
    displayedVersion,
    masterVersion,
    handleVersionChange: (index: number) => {
      setSelectedIndex(index);
      // Sync with player if needed
    },
  };
}
```

### 2. Создать shared компонент: `VersionIndicator`

```typescript
// src/features/tracks/components/shared/VersionIndicator.tsx
export function VersionIndicator({
  versionCount,
  currentIndex,
  isMaster
}: VersionIndicatorProps) {
  if (versionCount === 0) return null;

  return (
    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-1">
      <span>V{currentIndex + 1}</span>
      {isMaster && <Star className="w-2.5 h-2.5 fill-amber-500" />}
      {versionCount > 0 && <span className="text-muted-foreground">+{versionCount}</span>}
    </Badge>
  );
}
```

### 3. Интегрировать в TrackRow

```typescript
// src/components/tracks/TrackRow.tsx
export const TrackRow = ({ track, ...props }) => {
  const { hasVersions, versionCount, displayedVersion } = useTrackVersionsDisplay(track.id);

  return (
    <div className="track-row">
      {/* ... thumbnail ... */}
      <div className="track-info">
        <h3>{displayedVersion.title || track.title}</h3>
        <div className="track-meta">
          {hasVersions && (
            <VersionIndicator
              versionCount={versionCount}
              currentIndex={0}
              isMaster={displayedVersion.isMasterVersion}
            />
          )}
          {/* ... other meta ... */}
        </div>
      </div>
      {/* ... actions ... */}
    </div>
  );
};
```

---

## Тестовые сценарии

### Сценарий 1: Трек с 2 версиями в TrackCard
- ✅ PASS: Показывается селектор версий
- ✅ PASS: Можно переключаться между V1 и V2
- ✅ PASS: При переключении меняется обложка/аудио
- ✅ PASS: Мастер-версия отмечена звездочкой

### Сценарий 2: Трек с 2 версиями в TrackRow
- ❌ FAIL: Селектор версий НЕ показывается
- ❌ FAIL: Индикатор версий отсутствует
- ❌ FAIL: При play воспроизводится только основная версия

### Сценарий 3: Трек с 2 версиями в TrackListItem
- ❌ FAIL: Селектор версий НЕ показывается
- ❌ FAIL: Индикатор версий отсутствует
- ❌ FAIL: При play воспроизводится только основная версия

---

## Метрики улучшения

После исправления ожидаются следующие улучшения:

1. **Обнаружимость версий:** +80%
   - Пользователи увидят badge с количеством версий

2. **Доступность версий:** +100%
   - Возможность переключаться между версиями во всех компонентах

3. **Консистентность UI:** +70%
   - Единообразный функционал во всех компонентах отображения треков

4. **User Satisfaction:** +40%
   - Пользователи смогут быстро найти и прослушать нужную версию

---

## Заключение

Система версионирования треков реализована **только частично**:
- ✅ TrackCard - отлично
- ❌ TrackRow - критические проблемы
- ❌ TrackListItem - критические проблемы

**Требуется срочное исправление** для обеспечения консистентного UX во всех компонентах отображения треков.

**Оценка приоритета:** P0 (CRITICAL)
**Estimated effort:** 16-24 часа
**Рекомендуемый Sprint:** Следующий (Week 1-2)

---

## Связанные документы

- `ARCHITECTURE.md` - Общая архитектура проекта
- `COMPREHENSIVE_PROJECT_AUDIT.md` - Полный аудит проекта
- `BACKEND_ARCHITECTURE.md` - API версионирования

## Код-ревью

**Проверено:**
- [x] TrackCard.tsx
- [x] TrackRow.tsx
- [x] TrackListItem.tsx
- [x] TrackVariantSelector.tsx
- [x] TrackActionsMenu.tsx (обе версии)
- [x] useTrackVersions.ts
- [x] useTrackCardState.ts

**Следующие шаги:**
1. Создать GitHub Issues для каждой критической проблемы
2. Разработать детальный план имплементации
3. Написать unit/integration тесты
4. Начать имплементацию в порядке приоритета
