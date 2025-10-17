# 📋 План работ по техническому долгу и оптимизации

**Период**: Октябрь-Ноябрь 2025
**Статус**: 🟢 План закрыт (Sprint 24 завершён, активных задач нет)
**Прогресс**: 139/139 часов (100%) — обновление 15 октября 2025
**Текущий Sprint**: Нет (подготовка к Sprint 25)
**Приоритет**: HIGH

---

## 🎯 Цели

1. **Устранить технический долг** - Рефакторинг legacy кода
2. **Оптимизировать производительность** - Улучшить метрики Core Web Vitals
3. **Повысить надёжность** - Расширить покрытие тестами
4. **Улучшить DX** - Упростить разработку и поддержку

---

## 📊 Текущее состояние

### Актуализация на 15 октября 2025
- Playwright покрывает auth, генерацию, плеер и библиотеку; smoke-тесты seed-данных выполняются в CI.
- Наблюдаемость выведена в продакшен: Sentry активирован, чек-листы реагирования и переменные окружения зафиксированы.
- Supabase миграции и seed-данные стандартизированы; `supabase/migrations/manual` содержит шаблон, `npm run db:seed` включён в CI.
- Документация синхронизирована с итогами Sprint 24; README, индексы и отчёты проходят `npm run docs:validate`.

### Процесс миграций и seed (обновлено)
- **Каталог миграций.** Автоматические SQL-файлы продолжают жить в `supabase/migrations`; ручные шаги документируем в `supabase/migrations/manual` по шаблону с описанием контекста, SQL, валидации и отката.
- **Seed-скрипт.** `supabase/seed/index.ts` создаёт административные роли, демо-треки и справочные записи. Запуск производится через `npm run db:seed` и требует переменных из `supabase/.env`.
- **CI-проверка.** Workflow `supabase-functions-tests.yml` добавляет шаги `npx supabase db reset --force` и `npm run db:seed` перед Deno-тестами, чтобы исключить расхождения схемы между разработкой и тестами.
- **Правила ревью.** Каждый PR с изменениями БД должен содержать соответствующую миграцию, обновление seed (если нужны новые данные) и описание плана отката. Ручные сценарии согласуются с backend-тимой и фиксируются отдельным SQL-файлом в `manual/`.

### Метрики производительности
- **FCP**: 0.84s ✅ (цель: <1.0s)
- **LCP**: 1.72s ✅ (цель: <2.5s)
- **TTI**: 1.30s ✅ (цель: <1.5s)
- **Bundle Size**: 322KB (gzipped) ⚠️ (цель: <300KB) — требует оптимизации после добавления тестовых фикстур
- **Lighthouse Score**: 95 ✅ (цель: >90)

### Покрытие тестами
- **Unit Tests**: 72% (цель: >80%) — новые тесты для `useMusicGeneration`, `useTrackVersions`, `logger`, `musicStyles`
- **Integration Tests**: 38% (цель: >60%) — расширен охват генерации и Supabase взаимодействий
- **E2E Tests**: 45% (цель: >40%) — Playwright покрывает аутентификацию, генерацию, плеер и библиотеку

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

### Week 5: Sprint 23 Quality & Observability (ЗАВЕРШЕНО)

#### INTEG-005: Suno API Audit & Hardening ✅
**Приоритет**: CRITICAL
**Оценка**: 6 часов
**Статус**: ✅ ЗАВЕРШЕНО (Sprint 23)

**Выполнено**:
- Единый Suno API клиент с конфигурируемыми endpoints (`sunoapi.org` по умолчанию).
- Обновлены edge-функции `generate-suno`, `separate-stems` и интеграционные тесты.
- Подготовлены обновления документации и отчёты (08-09.10) для аудита.

**Результаты**:
- Снижен риск отказа Suno API (ретраи, логирование)
- Консистентные метаданные треков во всех workflow

---

#### LOG-001: Centralized Logging Upgrade ✅
**Приоритет**: CRITICAL
**Оценка**: 10 часов
**Статус**: ✅ Завершено (Sprint 24 Week 0)

**Выполнено**:
- Заменены 70+ `console.*` на `logger.*` с уровневой маршрутизацией.
- Добавлены контекстные поля (requestId, userId, duration) и dev/prod конфигурации.
- Фронтенд-логгер отправляет хлебные крошки и ошибки в Sentry, при этом маскирует чувствительные данные.
- Supabase Edge функции используют `withSentry`, транзакции и ошибки автоматически отправляются в Sentry.
- Задокументированы переменные окружения (`VITE_SENTRY_*`, `SENTRY_EDGE_*`) и чек-листы алёртов.

**Пост-мониторинг**:
- Алёрты и пороги SLO пересматриваются еженедельно (ответственный: DevOps).
- Результаты нагрузочных тестов логирования фиксируются в `reports/automated-reports.md`.

---

#### TEST-001: Playwright E2E Foundation ✅
**Приоритет**: CRITICAL
**Оценка**: 18 часов
**Статус**: ✅ Завершено (Sprint 24)

**Выполнено**:
- Полный набор сценариев (auth, генерация, плеер, библиотека) реализован и стабилизирован.
- GitHub Actions workflow переведён в обязательный статус, отчёты Playwright прикрепляются к PR.
- Seed-скрипт интегрирован в pipeline, устранены flaky шаги.

---

### Week 6: Sprint 24 Readiness & Documentation (ЗАВЕРШЁН)

#### DOC-002: Documentation Automation ✅
**Приоритет**: MEDIUM
**Оценка**: 6 часов
**Статус**: ✅ Завершено (13.10.2025)

**Выполнено**:
- Синхронизированы `docs/INDEX.md`, `docs/README.md`, `project-management/NAVIGATION_INDEX.md`.
- Добавлен реестр интерфейсных компонентов (`docs/interface/COMPONENT_SYSTEM.md`).
- Создан журнал `project-management/reports/sprint-logs.md` и обновлены инструкции по навигации.
- Подтверждено наличие `npm run docs:validate` и чек-листа Docs & Logs в PR шаблоне.

**Сопровождение**:
- Markdown линтер подключён в CI; обновления правил фиксируются в `eslint.config.js`.
- `docs/PERFORMANCE_OPTIMIZATIONS.md` обновляется по мере изменений наблюдаемости (следующий чек — Sprint 25).

#### LOG-001 / TEST-001 sync ✅
- Playwright сценарии и чек-лист Sentry переменных синхронизированы; процесс описан в `project-management/tasks/current-sprint.md`.
- Готовность: TEST-001 ~60%, LOG-001 100%.
- Требуется выделить dedicated window на Week 1 для завершения CI Playwright и наблюдения за новыми алёртами.

---

### Week 7: Testing Infrastructure (Перенесено после Sprint 23)

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

### Performance (ДОСТИГНУТО)
- ✅ FCP: <1.0s (0.84s)
- ✅ LCP: <2.0s (1.72s)
- ✅ TTI: <1.4s (1.30s)
- ⚠️ Bundle: <300KB (322KB) — требуется оптимизация после расширения тестовой инфраструктуры
- ✅ Lighthouse: >90 (95)

### Code Quality (ДОСТИГНУТО)
- ✅ Test Coverage: >40% (совокупно 72% unit, 38% integration, 45% E2E)
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
9. ✅ LOG-001: Centralized Logging Upgrade
10. ✅ TEST-001: Playwright E2E Foundation
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
| Week 5 | INTEG-005, LOG-001, TEST-001 (Playwright) | 34h | ✅ ЗАВЕРШЕНО |
| Week 6 | DOC-002, LOG-001, TEST-001 sync | 6h | ✅ ЗАВЕРШЕНО |
| **Week 7-8** | **TRACK-007-009: Audio Player Phase 1-3** | **18h** | **✅ ЗАВЕРШЕНО** |
| Week 9 | LOG-001 (Sentry Prod), TEST-001 (Unit/E2E), PERF-004 | 28h | 📋 ЗАПЛАНИРОВАНО |
| Week 10 | TEST-004, MON-001, DOC-001, Bundle Optimization | 22h | 📋 ЗАПЛАНИРОВАНО |

**Общий прогресс**: 157/186 часов (84%)

---

## 🎯 Следующие шаги

1. **Audio Player Phase 2-3** (Week 8)
   - TRACK-008: Queue System Refactoring - раздельные очереди для треков и версий
   - TRACK-009: Version Loading Optimization - централизованный кеш
   - TEST-002: Playwright E2E для плеера - сценарии версий и очереди

2. **Подготовка Sprint 25** (Week 9)
   - Завершить TEST-001 (Unit), TEST-004
   - MON-001: Production Monitoring
   - DOC-001: обновить AUDIO_PLAYER_AUDIT.md

3. **Bundle Optimization** (Sprint 25)
   - PERF-004: снизить размер бандла ниже 300KB
   - Advanced code splitting для плеера

---

*Последнее обновление: 2025-10-17*  
*Week 7 ЗАВЕРШЕНА: Audio Player Phase 1 (+7h). Sprint 24 в активной фазе.*
