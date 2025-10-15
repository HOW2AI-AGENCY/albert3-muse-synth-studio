# Аудит системы воспроизведения треков

**Дата**: 2025-10-15  
**Версия**: 2.4.0  
**Статус**: 🔴 Требуется рефакторинг

## 🎯 Обнаруженные проблемы

### 1. Конфликт локального и глобального состояния версий

#### Текущая архитектура
```
TrackCard (локальное состояние)
  ├─ activeVersionIndex: number
  ├─ handleVersionChange(index)
  └─ activeVersion = allVersions[activeVersionIndex]

AudioPlayerProvider (глобальное состояние)
  ├─ versions.currentVersionIndex
  ├─ switchToVersion(versionId)
  └─ Очередь версий для автоперехода
```

#### Проблема
- **TrackCard** управляет ВИЗУАЛЬНЫМ отображением версии (1/2, обложка, название)
- **AudioPlayerProvider** управляет РЕАЛЬНЫМ воспроизведением
- Эти два состояния НЕ синхронизированы!

#### Последствия
1. Пользователь нажимает стрелку → меняется только картинка на карточке
2. Плеер продолжает играть ДРУГУЮ версию
3. При воспроизведении игнорируется выбранная на карточке версия
4. DetailPanel показывает детали не той версии, что играет

---

### 2. Дублирование логики выбора версий

#### useSmartTrackPlay
```typescript
// Приоритет:
// 1. Мастер-версия (is_preferred_variant)
// 2. Оригинал (variant_index === 0)
// 3. Первая доступная

const selectBestVersion = (versions) => {
  const master = versions.find(v => v.isMasterVersion);
  if (master) return master;
  
  const original = versions.find(v => v.versionNumber === 0);
  if (original) return original;
  
  return versions[0];
}
```

#### TrackCard
```typescript
// Просто берет по индексу
const activeVersion = allVersions[activeVersionIndex];
```

#### Проблема
- Разная логика выбора "дефолтной" версии
- При монтировании TrackCard показывает версию 0 (оригинал)
- При воспроизведении может включиться мастер-версия
- Несогласованность UX

---

### 3. Множественные загрузки версий

#### Сценарий 1: Пользователь нажал Play
```
1. TrackCard.handlePlayClick()
2. playTrack(audioTrack) → AudioPlayerProvider
3. versions.loadVersions(trackId) ← ЗАГРУЗКА 1
4. queue.setQueue(allVersionsQueue)
5. playback.playTrack(track)
```

#### Сценарий 2: Версии уже загружены через useTrackVersions
```
1. TrackCard монтируется
2. useTrackVersions(trackId, autoLoad=true) ← ЗАГРУЗКА 2
3. versions загружены, mainVersion получен
```

#### Проблема
- **Двойная загрузка** одних и тех же данных
- Версии загружаются в TrackCard через `useTrackVersions`
- И снова загружаются в плеере через `AudioPlayerProvider.playTrack`
- Кэш помогает, но логика запутанная

---

### 4. Несогласованность порядка воспроизведения

#### Текущее поведение очереди
```typescript
// AudioPlayerProvider.playTrack
const allVersionsQueue = versionsList.map(v => ({...}));
queue.setQueue(allVersionsQueue);
```

**Проблема**: Каждый раз при `playTrack` очередь перезаписывается версиями трека!

#### Последствия
1. Пользователь добавил 5 треков в очередь
2. Нажал Play на одном треке → очередь заменилась на версии этого трека
3. Все остальные треки из очереди исчезли ❌

---

## 🔧 Предлагаемые решения

### Решение 1: Единая система состояния версий

#### Подход A: Карточка следует за плеером
```typescript
// TrackCard.tsx
const { currentTrack } = useAudioPlayer();

// Определяем активную версию из плеера
const activeVersionIndex = useMemo(() => {
  if (currentTrack?.parentTrackId === track.id) {
    return currentTrack.versionNumber ?? 0;
  }
  return 0; // Дефолт - оригинал
}, [currentTrack, track.id]);

// НЕ храним локальное состояние!
```

**Плюсы**:
- Единый источник истины
- Карточка всегда показывает то, что играет

**Минусы**:
- Нельзя "подготовить" версию до воспроизведения
- Смена версии сразу начинает воспроизведение

#### Подход B: Плеер следует за карточкой ⭐ РЕКОМЕНДУЕТСЯ
```typescript
// TrackCard.tsx
const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);

const handlePlayClick = () => {
  const version = allVersions[selectedVersionIndex];
  playTrack(version); // Воспроизводим ВЫБРАННУЮ версию
};

const handleVersionChange = (newIndex) => {
  setSelectedVersionIndex(newIndex);
  // НЕ воспроизводим сразу, только меняем визуал
};
```

**Плюсы**:
- Пользователь может "выбрать" версию до воспроизведения
- Интуитивно понятно: что выбрано → то и играет

**Минусы**:
- Нужно синхронизировать при изменении трека в плеере

---

### Решение 2: Рефакторинг системы очередей

#### Текущая проблема
```typescript
playTrack(track) → queue.setQueue(versions) // ❌ Перезапись очереди!
```

#### Предлагаемое решение
```typescript
// Раздельные очереди
interface AudioPlayerQueue {
  mainQueue: AudioPlayerTrack[];      // Очередь треков
  versionsQueue: AudioPlayerTrack[];  // Версии текущего трека
  mode: 'tracks' | 'versions';        // Режим воспроизведения
}

// Логика переключения
playNext() {
  if (mode === 'versions') {
    // Следующая версия текущего трека
    const nextVersion = versionsQueue[currentVersionIndex + 1];
    if (nextVersion) play(nextVersion);
    else mode = 'tracks'; // Переходим к следующему треку
  } else {
    // Следующий трек из очереди
    const nextTrack = mainQueue[currentTrackIndex + 1];
    play(nextTrack);
  }
}
```

**Поведение**:
1. Пользователь добавил треки A, B, C в очередь
2. Играет трек A (версия 1) → versionsQueue = [A-v1, A-v2]
3. Нажал Next → переключается на A-v2
4. Нажал Next еще раз → переключается на трек B

---

### Решение 3: Оптимизация загрузки версий

#### Проблема: Множественные загрузки
```typescript
// TrackCard
useTrackVersions(trackId, autoLoad=true); // ЗАГРУЗКА 1

// AudioPlayerProvider
versions.loadVersions(trackId);           // ЗАГРУЗКА 2
```

#### Решение: Использовать общий кэш
```typescript
// useTrackVersions уже использует кэш с Map
const versionsCache = new Map<string, TrackWithVersions[]>();

// AudioPlayerProvider должен проверять кэш
const playTrack = async (track) => {
  // Проверяем кэш перед загрузкой
  const cached = getVersionsFromCache(baseTrackId);
  const versionsList = cached || await loadVersions(baseTrackId);
  // ...
};
```

---

## 📝 План рефакторинга

### Phase 1: Исправление TrackCard ⚡ СРОЧНО
- [ ] Убрать локальное состояние `activeVersionIndex`
- [ ] Синхронизировать с `currentTrack.versionNumber` из плеера
- [ ] Убрать логику воспроизведения из `handlePlayClick`
- [ ] Использовать `playTrack(selectedVersion)` напрямую

### Phase 2: Рефакторинг очередей
- [ ] Создать `QueueManager` с раздельными очередями
- [ ] Реализовать режимы 'tracks' | 'versions'
- [ ] Обновить `playNext/playPrevious` логику

### Phase 3: Унификация загрузки версий
- [ ] Централизовать кэш версий
- [ ] Убрать дублирование загрузок
- [ ] Добавить preloading для быстрого переключения

### Phase 4: Тестирование
- [ ] Unit тесты для QueueManager
- [ ] Integration тесты для playback flow
- [ ] E2E тесты для UX сценариев

---

## 🎬 Критические сценарии для тестирования

### Сценарий 1: Переключение версий
```
Дано: Трек с 2 версиями (v0, v1)
1. Пользователь видит "1/2" на карточке
2. Нажимает стрелку → "2/2"
3. Нажимает Play
Ожидание: Должна играть v1 (вторая версия)
Текущее поведение: ❌ Играет v0 (первая версия)
```

### Сценарий 2: Очередь треков
```
Дано: 3 трека в очереди (A, B, C)
1. Играет трек A
2. Нажимает Next
Ожидание: Должен переключиться на трек B
Текущее поведение: ❌ Может переключиться на A-v2
```

### Сценарий 3: Детали трека
```
Дано: Трек с версиями, открыта DetailPanel
1. На карточке выбрана v1
2. Открывает DetailPanel
Ожидание: Должны показаться детали v1
Текущее поведение: ❌ Показываются детали v0
```

---

## 🔗 Связанные файлы

### Требуют изменений
- `src/features/tracks/components/TrackCard.tsx`
- `src/contexts/audio-player/AudioPlayerProvider.tsx`
- `src/contexts/audio-player/useAudioQueue.ts`
- `src/contexts/audio-player/useAudioVersions.ts`

### Могут потребовать обновления
- `src/components/workspace/DetailPanelContent.tsx`
- `src/features/tracks/ui/DetailPanel.tsx`
- `src/hooks/useSmartTrackPlay.ts`

---

## 💡 Рекомендации

1. **Срочно исправить**: Синхронизацию версий между TrackCard и плеером
2. **Средний приоритет**: Рефакторинг системы очередей
3. **Низкий приоритет**: Оптимизация загрузки (уже есть кэш)

---

**Статус**: Документ создан, требуется утверждение архитектуры решений
