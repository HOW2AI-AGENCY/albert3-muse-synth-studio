# 📋 План работ по техническому долгу и оптимизации

**Период**: Октябрь-Ноябрь 2025
**Статус**: ✅ Week 1-4 завершены, Week 5 (Sprint 23) закрыт на 75%, Week 6 (Sprint 24) в планировании
**Прогресс**: 86.5/139 часов (62.3%) — обновление после Sprint 24
**Текущий Sprint**: Sprint 24 - Stabilization & Delivery (ПЛАНИРОВАНИЕ)
**Приоритет**: HIGH

---

## 🎯 Цели

1. **Устранить технический долг** - Рефакторинг legacy кода
2. **Оптимизировать производительность** - Улучшить метрики Core Web Vitals
3. **Повысить надёжность** - Расширить покрытие тестами
4. **Улучшить DX** - Упростить разработку и поддержку

---

## 📊 Текущее состояние

### Актуализация на 10 октября 2025
- Playwright покрывает auth/generation; плеер/библиотека остаются в Sprint 24 (`TEST-001`).
- Sentry и наблюдаемость запланированы на Sprint 24 (`LOG-001`, `TASK-5.1`).
- Supabase миграции и seed-данные отсутствуют; инициирована задача `DATA-001`.
- Автоматизация документации добавлена в план Sprint 24 (`DOC-002`).

### Метрики производительности
- **FCP**: 0.86s ✅ (цель: <1.0s)
- **LCP**: 1.72s ✅ (цель: <2.5s)
- **TTI**: 1.32s ✅ (цель: <1.5s)
- **Bundle Size**: 322KB (gzipped) ⚠️ (цель: <300KB) — рост из-за Playwright фикстур
- **Lighthouse Score**: 95 ✅ (цель: >90)

### Покрытие тестами
- **Unit Tests**: 55% (цель: >80%) — обновлённые моки и shared utils
- **Integration Tests**: 28% (цель: >60%) — расширен охват генерации
- **E2E Tests**: 30% (цель: >40%) — Playwright покрывает аутентификацию и генерацию

### Технический долг
- **Code Duplication**: ~5% ✅ (цель: <5%)
- **Complex Functions**: 15 функций >50 строк ✅ (было: 23)
- **Missing Types**: ~5% компонентов без типов ✅ (было: 12%)
- **Legacy Code**: ~3% устаревших паттернов ✅ (было: 8%)

---

## 🗺️ Roadmap (6 недель)

### ✅ Завершено Week 1-2 (21.5 часов)

#### CREDIT-001: Credit Management System ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)  
**Время**: 3 часа

**Выполнено**:
- Создана система управления кредитами провайдера
- Edge Function `get-provider-balance`
- Хук `useProviderBalance`
- Отображение баланса в WorkspaceHeader
- Админская панель управления

---

#### PERF-001: Route-based Code Splitting ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)  
**Время**: 8 часов

**Выполнено**:
- Настроен vite.config.ts с manualChunks
- Vendor chunks: react, ui, query, supabase
- Feature chunks: player, tracks

**Результаты**:
- Bundle size: 380KB → 120KB ✅
- TTI: 2.2s → 1.4s ✅

---

#### PERF-002: Component Lazy Loading ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)  
**Время**: 6 часов

**Выполнено**:
- Lazy loading для: TrackDeleteDialog, LyricsEditor, TrackStemsPanel, PlayerQueue, NotificationsDropdown
- Suspense boundaries с fallback

**Результаты**:
- FCP: 1.5s → 0.9s ✅

---

#### PERF-003: React Query Optimization ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)  
**Время**: 4 часа

**Выполнено**:
- Optimistic updates для лайков
- staleTime configuration

---

#### GEN-001: Generation Stability ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 22)  
**Время**: 4 часа

**Выполнено**:
- Унификация @supabase/supabase-js версий
- Улучшенное логирование API
- User-friendly error messages

---

#### UI-001: Desktop Generator Refactoring ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 22)  
**Время**: 4 часа

**Выполнено**:
- Исправлена разметка Desktop Player
- DOM validation fixes
- Responsive improvements

---

#### TRACK-001: Track Versions Fallback ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 22)  
**Время**: 3 часа

**Выполнено**:
- Fallback из metadata.suno_data
- Virtual versions support
- TypeScript fixes

---

#### INTEG-001: Edge Functions Unification ✅
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 22)  
**Время**: 3 часа

**Выполнено**:
- Унифицированы 5 edge functions
- Build pipeline стабилизирован

---

### Week 3-4: Устранение технического долга (В ПРОЦЕССЕ)

#### DEBT-001: Code Deduplication & Refactoring ✅
**Приоритет**: HIGH  
**Оценка**: 12 часов  
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)

**Выполнено**:
- Централизация formatTime/formatDuration
- Shared hooks: usePlayerControls, usePlayerState

**Результаты**:
- Code Duplication: 15% → 5% ✅

---

#### DEBT-002: Type Safety Enhancement ✅
**Приоритет**: MEDIUM  
**Оценка**: 8 часов  
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)

**Выполнено**:
- TypeScript strict mode enabled
- Type errors: resolved

---

#### DEBT-003: Remove Legacy Code ✅
**Приоритет**: LOW
**Оценка**: 4 часа
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)

**Выполнено**:
- Удалены устаревшие утилиты
- Codebase размер: -5%

---

### Week 5: Sprint 23 Quality & Observability (В ПРОГРЕССЕ)

#### INTEG-005: Suno API Audit & Hardening ✅
**Приоритет**: CRITICAL
**Оценка**: 6 часов
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 23)

**Выполнено**:
- Единый Suno API клиент с fallback на `sunoapi.org`/`api.suno.ai`.
- Обновлены edge-функции `generate-suno`, `separate-stems` и интеграционные тесты.
- Подготовлены обновления документации и отчёты (08-09.10) для аудита.

**Результаты**:
- Снижен риск отказа Suno API (ретраи, логирование)
- Консистентные метаданные треков во всех workflow

---

#### LOG-001: Centralized Logging Upgrade 🔄
**Приоритет**: CRITICAL
**Оценка**: 10 часов
**Статус**: 🔄 В процессе (85%)

**Выполнено**:
- Заменены 70+ `console.*` на `logger.*` с уровневой маршрутизацией.
- Добавлены контекстные поля (requestId, userId, duration) и dev/prod конфигурации.
- Создан черновой Sentry-пайплайн и dashboard для критических событий.

**Оставшиеся шаги**:
- Подключить production alerts и финализировать retention-политику.
- Провести нагрузочные тесты логирования перед релизом 2.6.2.

---

#### TEST-001: Playwright E2E Foundation 🔄
**Приоритет**: CRITICAL
**Оценка**: 18 часов
**Статус**: 🔄 В процессе (70%)

**Выполнено**:
- Настроен Playwright и тестовые фикстуры для аутентификации и генерации треков.
- Draft GitHub Actions workflow выполняет smoke-прогон по pull-request.
- Подготовлены шаблоны отчётов и тестовые данные для QA команды.

**Оставшиеся шаги**:
- Расширить покрытие playback/библиотеки и стабилизировать flaky шаги.
- Перевести workflow в обязательный статус и подключить визуальные снимки.

---

### Week 6: Testing Infrastructure (Перенесено после Sprint 23)

#### TEST-001: Unit Testing Setup & Coverage
**Приоритет**: HIGH
**Оценка**: 16 часов
**Статус**: 📋 Перенесено (после Sprint 23)

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

**Целевое покрытие**:
- Hooks: >90%
- Utils: >95%
- Components: >70%
- Overall: >80%

---

#### TEST-004: Fix Existing Test Suite
**Приоритет**: HIGH
**Оценка**: 12 часов
**Статус**: 📋 Перенесено (после Sprint 23)

**Задачи**:
- Рефакторинг тестов с stateful-врапперами
- Замена текстовых запросов на корректные русские строки
- Переход на aria-selected для табов
- Замена require на vi.mock

---

### Week 7: Monitoring & Documentation (ЗАПЛАНИРОВАНО)

#### MON-001: Production Monitoring
**Приоритет**: HIGH  
**Оценка**: 10 часов  
**Статус**: 📋 ЗАПЛАНИРОВАНО

**Задачи**:
1. Web Vitals Tracking (3h)
2. Error Tracking - Sentry.io (3h)
3. Performance Monitoring (4h)

---

#### DOC-001: Documentation Update ✅
**Приоритет**: MEDIUM  
**Оценка**: 8 часов  
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 21)

**Выполнено**:
- Knowledge Base creation
- Architecture docs
- Onboarding guide

---

## 📈 Метрики успеха

### Performance (В ПРОГРЕССЕ)
- ✅ FCP: <1.0s (0.86s)
- ✅ LCP: <2.0s (1.72s)
- ✅ TTI: <1.4s (1.32s)
- ⚠️ Bundle: <300KB (322KB) — временный рост из-за Playwright фикстур
- ✅ Lighthouse: >90 (95)

### Code Quality (В ПРОГРЕССЕ)
- 🔄 Test Coverage: >40% (55% суммарно, E2E 30%)
- ✅ Code Duplication: <5% (1.6%)
- ✅ Type Coverage: >95% (95%)
- ✅ ESLint Warnings: 0

### Developer Experience (ДОСТИГНУТО)
- ✅ Build Time: <10s (8s)
- ✅ HMR: <100ms (80ms)
- ✅ Documentation: Comprehensive

---

## 🔄 Приоритизация

### Критические (Must Have)
1. ✅ PERF-001: Route-based Code Splitting
2. ✅ PERF-002: Component Lazy Loading
3. ✅ GEN-001: Generation Stability
4. ✅ UI-001: Desktop Generator Refactoring
5. ✅ INTEG-001: Edge Functions Unification
6. ✅ INTEG-005: Suno API Audit & Hardening

### Высокий приоритет (Should Have)
7. ✅ DEBT-001: Code Deduplication
8. ✅ PERF-003: React Query Optimization
9. 🔄 LOG-001: Centralized Logging Upgrade (85%)
10. 🔄 TEST-001: Playwright E2E Foundation (70%)
11. 📋 TEST-001: Unit Testing Setup (перенос)
12. 📋 TEST-004: Fix Existing Tests (перенос)
13. ✅ DEBT-002: Type Safety Enhancement
14. 📋 MON-001: Production Monitoring

### Средний приоритет (Nice to Have)
15. ✅ DEBT-003: Remove Legacy Code
16. ✅ DOC-001: Documentation Update

---

## 📅 График выполнения

| Неделя | Задачи | Часы | Статус |
|--------|--------|------|--------|
| Week 1-2 | PERF-001, PERF-002, PERF-003, CREDIT-001 | 21h | ✅ ЗАВЕРШЕНО |
| Week 2 | GEN-001, UI-001, TRACK-001, INTEG-001 | 14h | ✅ ЗАВЕРШЕНО |
| Week 3-4 | DEBT-001, DEBT-002, DEBT-003 | 24h | ✅ ЗАВЕРШЕНО |
| Week 5 | INTEG-005, LOG-001, TEST-001 (Playwright) | 34h | 🔄 В ПРОГРЕССЕ |
| Week 6 | TEST-001 (Unit), TEST-004 | 28h | 📋 Перенесено |
| Week 7 | MON-001, DOC-001 | 18h | 📋 ЗАПЛАНИРОВАНО |

**Общий прогресс**: 86.5/139 часов (62.3%)

---

## 🎯 Следующие шаги

1. **LOG-001**: Завершить Sentry alerts и нагрузочное тестирование (10h → 1.5h осталось)
2. **TEST-001**: Playwright E2E — покрытие playback/библиотеки + CI стабилизация (18h → 5h осталось)
3. **STYLE-001**: Завершить AI-рекомендации и пресеты для релиза 2.6.2 (16h → 8h осталось)
4. **TEST-001 (Unit)**: Перенести план покрытия на post-Sprint 23 окно (16h)
5. **MON-001**: Production Monitoring (10h)

---

*Последнее обновление: 2025-10-10*
*Sprint 23 прогресс: 3/4 задач (75%)*
*Week 1-4: ЗАВЕРШЕНО (59.5/59 часов), Week 5 в работе*
