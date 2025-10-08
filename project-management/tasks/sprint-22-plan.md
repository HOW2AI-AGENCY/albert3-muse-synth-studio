# 🚀 Текущий спринт: Sprint 22 - Generation Reliability & Desktop UX

Статус: ⏳ В РАБОТЕ (начат)
Период: Октябрь 2025 (неделя 4)
Версия: 2.5.1
Обновлено: 8 октября 2025

---

## 🎯 Цели спринта
- Починить генерацию: стабильные вызовы backend-функций, понятные ошибки
- Редизайн формы генерации на десктопе: аккуратная, компактная, без «поехавшей» разметки

---

## ✅ Выполнено (сегодня)
- FIX: Edge Function get-balance принимает provider из POST body (совместимо с functions.invoke)
- FIX: Хук useProviderBalance теперь вызывает get-balance через supabase.functions.invoke (устранены CORS/префлайт-проблемы)
- FIX (UI): MusicGenerator (desktop) — добавлены relative/overflow-hidden к карточке для корректной слоёв и размеров
- FIX: Track Versions — добавлен fallback для загрузки из metadata.suno_data
- FIX: Desktop Player — исправлена разметка volume slider и close button
- FIX: DOM nesting в TrackDeleteDialog (убрана вложенность ul внутри AlertDialogDescription)
- FIX: Унифицирована версия @supabase/supabase-js@2.39.3 во всех edge functions
- IMPROVED: Детальное логирование в api.service.ts (timestamps, duration, structured logs)

---

## 🔨 В работе
1. GEN-001 — Починка генерации Suno/Replicate (стабилизация вызовов)
   - Состояние: В прогрессе
   - Оценка: 3ч
   - Заметки: проверка ошибок 401/402/429, унификация payload

2. UI-001 — Рефакторинг десктоп-формы генерации
   - Состояние: В прогрессе
   - Оценка: 4ч
   - Заметки: скролл контейнер, адаптация к узкой панели, авто-высота textarea

---

## 📋 План на завтра
- Лёгкий лэйаут-тюнинг панели генератора (desktop): ограничение высоты, плавный скролл
- Диагностика generate-suno по логам, обработка edge-case ошибок

---

## 🔗 Артефакты
- CHANGELOG: см. v2.5.1 (исправления invoke + UI)
- Навигация: project-management/NAVIGATION_INDEX.md → Sprint 22 Current
