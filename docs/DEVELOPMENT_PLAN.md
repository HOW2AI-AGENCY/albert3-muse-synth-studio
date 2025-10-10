# 🚀 План разработки Albert3 Muse Synth Studio

**Последнее обновление:** 13 октября 2025 · **Ответственный:** Product & Delivery

Документ описывает приоритеты и план работ на Sprint 24 (Stabilization & Delivery) и подготовку к Sprint 25. Используйте его как рефер
енс при планировании задач, ревью документации и синхронизации с командой разработки.

---

## 📊 Текущий статус

- **Текущий спринт:** Sprint 24 — Stabilization & Delivery (23.10–05.11)
- **Этап:** Week 0 завершён, DOC-002 закрыт, подготовлены черновики для TEST-001 и LOG-001.
- **Основные риски:** отсутствие production Sentry и полного покрытия Playwright до начала Week 1.
- **Цели:** стабилизировать критические сценарии, довести AI-рекомендации, стандартизировать миграции Supabase.

---

## 🗓️ Sprint 24 — Stabilization & Delivery

### Week 0 (13 октября 2025) — Readiness Review ✅
- Завершено: синхронизированы `docs/INDEX.md`, `docs/README.md`, `project-management/NAVIGATION_INDEX.md`.
- Добавлен реестр интерфейсных компонентов (`docs/interface/COMPONENT_SYSTEM.md`) и журнал `project-management/reports/sprint-logs.md`.
- Обновлены статусы задач: TEST-001 (~60%), LOG-001 (~70%), STYLE-001 (пресеты обновлены), DATA-001 стартует на Week 1.
- Подтверждено наличие автоматических проверок документации (`npm run docs:validate`, чек-лист Docs & Logs).

### Week 1 (14–20 октября) — Observability & Playwright ⚙️
- **LOG-001:** включить Sentry (frontend + Edge Functions), настроить алёрты в Slack/Email, обновить `docs/PERFORMANCE_OPTIMIZATIONS.md`.
- **TEST-001:** завершить сценарии плеера/библиотеки, добавить smoke-тесты библиотеки, включить Playwright в обязательные CI проверки.
- **DOC-002 follow-up:** внедрить Markdown линтер для `docs/` и `project-management/`.
- **Артефакты:** обновление `project-management/reports/sprint-logs.md`, публикация гайда по Sentry в `project-management/tools/qa`.

### Week 2 (21–27 октября) — Supabase Governance & AI Styles 🎼
- **DATA-001:** создать каталог `supabase/migrations/manual`, подготовить README и примеры ручных сценариев, расширить CI проверку миграций/seed.
- **STYLE-001:** интегрировать AI сервис рекомендаций, добавить кеширование, провести UX-тестирование (5 пользователей) и задокументировать выводы.
- **TEST-001:** стабилизировать flaky шаги, подготовить отчёты Playwright и зафиксировать критерии приёмки в `tasks/sprint-24-plan.md`.
- **Deliverables:** обновления в `docs/architecture/ARCHITECTURE.md`, `project-management/TECHNICAL_DEBT_PLAN.md`, отчёт UX-тестирования в `project-management/reports`.

### Week 3 (28 октября – 5 ноября) — Wrap-up & Release 🚀
- Финализировать релиз 2.6.3: провести regression-тесты, обновить CHANGELOG и подготовить релиз-ноты.
- Провести ретроспективу Sprint 24, собрать метрики (Core Web Vitals, Playwright pass rate) и задокументировать в `project-management/reports/sprint-logs.md`.
- Подготовить backlog для Sprint 25 (обновить `tasks/backlog.md`, `tasks/TASKS_STATUS.md`).

---

## 🔭 Подготовка к Sprint 25 — Experience Expansion (предварительно)

### Основные темы
1. **Realtime & Collaboration:** WebSocket уведомления, живые комментарии и совместное редактирование (перенесённые задачи MED-005, MED-006).
2. **Testing Infrastructure:** Возврат к unit-покрытию (TEST-001 Unit, TEST-004) и внедрение визуальных регрессий.
3. **Monitoring & Analytics:** MON-001 (production monitoring) + расширение Sentry Performance.
4. **UI Enhancements:** тёмная тема (UI-002) и подготовка Storybook для компонентов.

### Предварительный роадмап
- **Week 1:** Завершить real-time уведомления и подготовить beta PWA функциональности.
- **Week 2:** Storybook, design tokens, консолидация UI/UX гайдов.
- **Week 3:** Unit тесты, визуальные регрессии, интеграция Percy/Chromatic.
- **Week 4:** Production monitoring, отчёты Sentry Performance, подготовка релиза 2.7.0.

---

## 📋 Чек-лист синхронизации

1. Обновлять `tasks/current-sprint.md`, `tasks/sprint-24-plan.md` и `TECHNICAL_DEBT_PLAN.md` после каждой ключевой вехи.
2. Поддерживать `project-management/reports/sprint-logs.md` в актуальном состоянии (минимум раз в неделю).
3. Выполнять `npm run docs:validate` перед каждым merge в main.
4. Фиксировать изменения в README и `docs/INDEX.md` для новых артефактов.
5. Подготовить метрики (Playwright pass rate, Sentry alert count, LCP/FCP) к ретроспективе Sprint 24.

