# 📋 План работ по техническому долгу и оптимизации

**Период**: Октябрь-Ноябрь 2025  
**Статус**: Планирование  
**Приоритет**: HIGH

---

## 🎯 Цели

1. **Устранить технический долг** - Рефакторинг legacy кода
2. **Оптимизировать производительность** - Улучшить метрики Core Web Vitals
3. **Повысить надёжность** - Расширить покрытие тестами
4. **Улучшить DX** - Упростить разработку и поддержку

---

## 📊 Текущее состояние

### Метрики производительности
- **FCP**: 1.5s (цель: <1.0s) ⚠️
- **LCP**: 2.8s (цель: <2.5s) ⚠️
- **TTI**: 2.2s (цель: <1.5s) ⚠️
- **Bundle Size**: 380KB (цель: <250KB) ⚠️
- **Lighthouse Score**: 75 (цель: >90) ⚠️

### Покрытие тестами
- **Unit Tests**: ~30% (цель: >80%)
- **Integration Tests**: ~10% (цель: >60%)
- **E2E Tests**: 0% (цель: >40%)

### Технический долг
- **Code Duplication**: ~15% (цель: <5%)
- **Complex Functions**: 23 функции >50 строк
- **Missing Types**: ~12% компонентов без типов
- **Legacy Code**: ~8% устаревших паттернов

---

## 🗺️ Roadmap (6 недель)

### Week 1-2: Критические оптимизации производительности
**Фокус**: Code Splitting & Lazy Loading

#### PERF-001: Route-based Code Splitting
**Приоритет**: CRITICAL  
**Оценка**: 8 часов

**Задачи**:
1. Конвертировать статические импорты в React.lazy для всех страниц
2. Добавить Suspense boundaries с loading скелетонами
3. Настроить prefetching для критических маршрутов
4. Оптимизировать chunk splitting в vite.config.ts

**Файлы**:
```
src/main.tsx
src/App.tsx
src/pages/workspace/*.tsx
vite.config.ts
```

**Ожидаемый результат**:
- Bundle size: 380KB → 180KB (initial)
- TTI: 2.2s → 1.4s
- Lighthouse: 75 → 82

---

#### PERF-002: Component Lazy Loading
**Приоритет**: HIGH  
**Оценка**: 6 часов

**Задачи**:
1. Lazy load модалов и диалогов (TrackDeleteDialog, LyricsEditor)
2. Lazy load тяжелых компонентов (MusicGenerator, TrackStemsPanel)
3. Добавить dynamic imports для условных компонентов
4. Реализовать component preloading на hover

**Компоненты для lazy loading**:
- TrackDeleteDialog
- LyricsEditor
- TrackStemsPanel
- DetailPanel
- PlayerQueue
- NotificationsDropdown

**Ожидаемый результат**:
- Initial bundle: 180KB → 120KB
- FCP: 1.5s → 0.9s

---

#### PERF-003: React Query Optimization
**Приоритет**: MEDIUM  
**Оценка**: 6 часов

**Задачи**:
1. Настроить staleTime и cacheTime для всех queries
2. Реализовать optimistic updates для лайков/удалений
3. Добавить query prefetching для предсказуемых переходов
4. Оптимизировать refetch стратегии

**Queries для оптимизации**:
- useTracks (staleTime: 5min, cacheTime: 10min)
- useTrackVersions (staleTime: 10min)
- useTrackStems (staleTime: 15min)
- Optimistic updates для likes

---

### Week 3-4: Устранение технического долга

#### DEBT-001: Code Deduplication & Refactoring
**Приоритет**: HIGH  
**Оценка**: 12 часов

**Задачи**:
1. **Дублирование в компонентах плеера** (6h)
   - Выделить общую логику из GlobalAudioPlayer, FullScreenPlayer, MiniPlayer
   - Создать shared hooks: usePlayerControls, usePlayerState
   - Унифицировать обработку версий треков
   
2. **Дублирование утилит форматирования** (2h)
   - Консолидировать formatTime, formatDuration в src/utils/formatters.ts
   - Добавить тесты для всех форматтеров
   
3. **Рефакторинг AudioPlayerContext** (4h)
   - Разделить на несколько контекстов: PlaybackContext, QueueContext, VersionsContext
   - Уменьшить размер контекста для минимизации re-renders
   - Добавить debug logging для state changes

**Файлы**:
```
src/components/player/GlobalAudioPlayer.tsx → usePlayerControls
src/components/player/FullScreenPlayer.tsx → usePlayerState
src/components/player/MiniPlayer.tsx
src/contexts/AudioPlayerContext.tsx → split into 3 contexts
src/utils/formatters.ts
```

---

#### DEBT-002: Type Safety Enhancement
**Приоритет**: MEDIUM  
**Оценка**: 8 часов

**Задачи**:
1. **Добавить строгие типы в недотипизированные компоненты** (4h)
   - TrackCard props
   - MusicGenerator callbacks
   - DetailPanel state
   
2. **Создать utility types** (2h)
   ```typescript
   // src/types/utils.ts
   type Nullable<T> = T | null;
   type Optional<T> = T | undefined;
   type AsyncState<T> = {
     data: T | null;
     loading: boolean;
     error: Error | null;
   };
   ```
   
3. **Strict TypeScript config** (2h)
   - Включить strict mode
   - Включить noUncheckedIndexedAccess
   - Исправить все type errors

**Файлы**:
```
tsconfig.json
src/types/utils.ts
src/types/track.ts
src/components/TrackCard.tsx
src/components/MusicGenerator.tsx
```

---

#### DEBT-003: Remove Legacy Code
**Приоритет**: LOW  
**Оценка**: 4 часа

**Задачи**:
1. Удалить неиспользуемые компоненты (LoadingSkeleton дубликаты)
2. Удалить deprecated утилиты (old cache management)
3. Удалить commented out code
4. Обновить устаревшие паттерны (Class components → Functional)

**Код для удаления**:
- src/components/ui/LoadingSkeleton.tsx (дубликат)
- src/utils/trackCache.ts (старая версия)
- Закомментированный код в DetailPanel
- Legacy error boundaries

---

### Week 5: Testing Infrastructure

#### TEST-001: Unit Testing Setup & Coverage
**Приоритет**: HIGH  
**Оценка**: 16 часов

**Задачи**:
1. **Hooks тесты** (6h)
   - useTrackVersions
   - useMusicGeneration
   - useAudioPlayer
   - useTrackSync
   - useTrackLike
   
2. **Utils тесты** (4h)
   - formatters.ts (100% coverage)
   - trackVersions.ts
   - logger.ts
   - musicStyles.ts
   
3. **Components тесты** (6h)
   - TrackCard (critical paths)
   - MusicGenerator (form validation)
   - TrackVersions (version management)
   - TrackListItem (interactions)

**Инструменты**:
- Vitest + Testing Library
- MSW для API mocking
- Coverage: c8

**Целевое покрытие**:
- Hooks: >90%
- Utils: >95%
- Components: >70%
- Overall: >80%

---

#### TEST-002: Integration Testing
**Приоритет**: MEDIUM  
**Оценка**: 12 часов

**Задачи**:
1. **Player Integration Tests** (4h)
   - Воспроизведение трека → пауза → skip
   - Переключение версий → seek → volume
   - Queue management → reorder → clear
   
2. **Generation Flow Tests** (4h)
   - Форма генерации → валидация → submit
   - Отслеживание прогресса → real-time updates
   - Error handling → retry
   
3. **Library Management Tests** (4h)
   - Загрузка треков → фильтрация → сортировка
   - Лайки → удаление → batch operations
   - Stems separation → download

**Setup**:
- Supabase test database
- Fixtures для track data
- Mock edge functions

---

#### TEST-003: E2E Testing Infrastructure
**Приоритет**: HIGH  
**Оценка**: 12 hours

**Задачи**:
1. **Playwright Setup** (3h)
   - Установка и конфигурация
   - CI/CD интеграция (GitHub Actions)
   - Test fixtures и helpers
   
2. **Critical User Flows** (7h)
   - Auth flow (signup → login → logout)
   - Music generation (create → view → play)
   - Playback (play → pause → skip → version switch)
   - Library (view → filter → delete)
   - Stems separation (generate → download)
   
3. **Visual Regression** (2h)
   - Screenshot comparison setup
   - Component snapshots
   - Responsive breakpoints testing

**Инструменты**:
- Playwright
- Percy.io (опционально)
- Lighthouse CI

**Coverage цели**:
- Critical flows: 100%
- Secondary flows: 60%
- Visual regression: 80%

---

### Week 6: Monitoring & Documentation

#### MON-001: Production Monitoring
**Приоритет**: HIGH  
**Оценка**: 10 часов

**Задачи**:
1. **Web Vitals Tracking** (3h)
   ```typescript
   // src/utils/monitoring.ts
   import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';
   
   export function initMonitoring() {
     onCLS(sendToAnalytics);
     onFCP(sendToAnalytics);
     onFID(sendToAnalytics);
     onLCP(sendToAnalytics);
     onTTFB(sendToAnalytics);
   }
   ```
   
2. **Error Tracking** (3h)
   - Sentry.io integration
   - Error boundary instrumentation
   - Source maps upload
   - Custom error context
   
3. **Performance Monitoring** (4h)
   - Custom performance marks
   - Track generation timing
   - API response times
   - Bundle loading metrics

**Инструменты**:
- web-vitals
- Sentry.io
- Custom analytics

---

#### DOC-001: Documentation Update
**Приоритет**: MEDIUM  
**Оценка**: 8 часов

**Задачи**:
1. **Code Documentation** (3h)
   - JSDoc для всех public APIs
   - README для каждого модуля
   - Type documentation
   
2. **Architecture Docs** (3h)
   - Component hierarchy diagrams
   - State management flow
   - Data flow diagrams
   - API integration guide
   
3. **Developer Guide** (2h)
   - Setup instructions
   - Testing guide
   - Contribution guidelines
   - Troubleshooting

**Файлы**:
```
docs/ARCHITECTURE.md (update)
docs/TESTING_GUIDE.md (new)
docs/CONTRIBUTING.md (new)
docs/TROUBLESHOOTING.md (new)
README.md (update)
```

---

## 📈 Метрики успеха

### Performance (после всех оптимизаций)
- ✅ FCP: <1.0s (было: 1.5s)
- ✅ LCP: <2.0s (было: 2.8s)
- ✅ TTI: <1.2s (было: 2.2s)
- ✅ Bundle: <200KB (было: 380KB)
- ✅ Lighthouse: >90 (было: 75)

### Code Quality
- ✅ Test Coverage: >80% (было: 30%)
- ✅ Code Duplication: <5% (было: 15%)
- ✅ Type Coverage: >95% (было: 88%)
- ✅ ESLint Warnings: 0 (было: 47)

### Developer Experience
- ✅ Build Time: <10s (было: 18s)
- ✅ HMR: <100ms (было: 300ms)
- ✅ Test Run: <30s (было: N/A)
- ✅ Documentation: 100% APIs documented

---

## 🔄 Приоритизация

### Критические (Must Have)
1. PERF-001: Route-based Code Splitting
2. PERF-002: Component Lazy Loading
3. TEST-001: Unit Testing Setup
4. TEST-003: E2E Testing
5. MON-001: Production Monitoring

### Высокий приоритет (Should Have)
6. DEBT-001: Code Deduplication
7. PERF-003: React Query Optimization
8. TEST-002: Integration Testing
9. DEBT-002: Type Safety Enhancement

### Средний приоритет (Nice to Have)
10. DEBT-003: Remove Legacy Code
11. DOC-001: Documentation Update

---

## 📅 График выполнения

| Неделя | Задачи | Часы | Приоритет |
|--------|--------|------|-----------|
| Week 1 | PERF-001, PERF-002 | 14h | CRITICAL |
| Week 2 | PERF-003, Start DEBT-001 | 12h | HIGH |
| Week 3 | DEBT-001, DEBT-002 | 16h | HIGH |
| Week 4 | DEBT-003, Start TEST-001 | 12h | MEDIUM |
| Week 5 | TEST-001, TEST-002, TEST-003 | 40h | HIGH |
| Week 6 | MON-001, DOC-001 | 18h | MEDIUM |

**Общее время**: ~112 часов (~3 недели full-time)

---

## 🎯 Следующие шаги

1. ✅ Создать этот документ
2. 📋 Создать GitHub issues для каждой задачи
3. 📋 Настроить project board для tracking
4. 📋 Начать с PERF-001 (Route-based splitting)
5. 📋 Еженедельные ревью прогресса

**Дата начала**: 9 октября 2025  
**Планируемое завершение**: 20 ноября 2025

---

*Последнее обновление: 8 октября 2025*
