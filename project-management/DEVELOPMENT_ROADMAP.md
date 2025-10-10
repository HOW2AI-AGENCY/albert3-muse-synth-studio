# 🗺️ План дальнейшего развития Albert3 Muse Synth Studio

**Последнее обновление:** 13 октября 2025 · **Релизный фокус:** 2.6.3 (Stabilization & Delivery)

Документ отражает стратегию выполнения задач на Sprint 24 и предварительный роадмап на Sprint 25+. Подробные weekly-планы см. в
[`docs/DEVELOPMENT_PLAN.md`](../docs/DEVELOPMENT_PLAN.md), высокоуровневый обзор — в [`docs/ROADMAP.md`](../docs/ROADMAP.md).

---

## 📊 Текущий статус

| Метрика | Значение | Комментарий |
|---------|----------|-------------|
| Sprint 24 Progress | 1/5 задач (20%) | DOC-002 закрыт, Week 0 завершён |
| Playwright Coverage | ~60% критических сценариев | Остались плеер/библиотека, smoke библиотек |
| Observability | Logger готов, Sentry чек-лист собран | Запуск alerting планируется на Week 1 |
| Supabase Governance | Требования подтверждены | Реализация начинается на Week 1 |
| Documentation | Индексы, навигация, реестр компонентов обновлены | `npm run docs:validate` обязательный чек |

---

## 🎯 Ближайшие цели (Sprint 24)

1. **TEST-001 — Playwright**
   - Завершить сценарии плеера и библиотеки, стабилизировать CI workflow.
   - Добавить smoke-тесты библиотеки и включить отчёты в артефакты CI.
2. **LOG-001 — Observability**
   - Настроить Sentry (frontend + Edge Functions), алёрты в Slack/Email.
   - Документировать процесс в `docs/PERFORMANCE_OPTIMIZATIONS.md` и `project-management/tools/qa`.
3. **STYLE-001 — AI Styles**
   - Запустить AI рекомендации, обновить `components.json`, провести UX-тесты (5 пользователей).
4. **DATA-001 — Supabase Governance**
   - Добавить `supabase/migrations/manual`, обновить README, расширить CI проверки.
5. **DOC-002 Follow-up**
   - Подключить Markdown lint для `docs/` и `project-management/`, поддерживать `sprint-logs` еженедельно.

---

## 🗓️ Календарный план Sprint 24

| Неделя | Фокус | Основные артефакты |
|--------|-------|---------------------|
| Week 0 (13.10) | Readiness Review | `docs/interface/COMPONENT_SYSTEM.md`, обновлённые индексы, `reports/sprint-logs.md` |
| Week 1 (14–20.10) | Playwright + Observability | Завершение сценариев плеера/библиотеки, запуск Sentry alerts |
| Week 2 (21–27.10) | Supabase + AI Styles | README миграций, UX-отчёт по стилям, обновления в `TECHNICAL_DEBT_PLAN.md` |
| Week 3 (28.10–05.11) | Release 2.6.3 | Regression тесты, CHANGELOG, ретроспектива и метрики |

---

## 🔭 Preview — Sprint 25 (Experience Expansion)

- **Realtime:** MED-005 (уведомления), MED-006 (интеграции) + подготовка PWA функций.
- **UI/UX:** UI-002 (тёмная тема), Storybook/дизайн-токены, улучшение responsive layout.
- **Testing:** TEST-001 (unit), TEST-004 (stability), визуальные регрессии.
- **Monitoring:** MON-001, расширение Sentry Performance и web-vitals.

---

## 📌 Связанные документы

- `docs/DEVELOPMENT_PLAN.md` — недельные планы и deliverables.
- `docs/ROADMAP.md` — high-level roadmap на Sprints 24–26 и H1 2026.
- `project-management/TECHNICAL_DEBT_PLAN.md` — прогресс по техдолгу и метрики.
- `project-management/tasks/sprint-24-plan.md` — чек-листы и критерии приёмки.
- `project-management/reports/sprint-logs.md` — еженедельные журналы.

---

## ✅ Чек-лист управления

- [x] Обновлены индексы документации и навигация (Week 0).
- [ ] Включён Sentry alerting (LOG-001) — запланировано на Week 1.
- [ ] Завершено Playwright покрытие плеера/библиотеки — запланировано на Week 1.
- [ ] Выполнено UX-тестирование AI стилей — Week 2.
- [ ] Завершён релиз 2.6.3 и ретроспектива — Week 3.

