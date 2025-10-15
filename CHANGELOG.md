# 📝 Changelog

Все заметные изменения в проекте **Albert3 Muse Synth Studio** будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

---

## [2.7.2] - 2025-10-15

### 🔥 Critical Fixes

#### Исправлена логика Suno генерации
- **Проблема**: В simple mode промпт отправлялся как lyrics, из-за чего Suno пел промпт буквально
- **Решение**: Разделение логики - в simple mode `prompt` = style description, в custom mode `prompt` = lyrics
- **Файлы**:
  - `supabase/functions/generate-suno/index.ts` - исправлена логика payload формирования
  - `src/services/generation/generation.service.ts` - синхронизация параметров
  - `src/components/generator/forms/PromptInput.tsx` - адаптивные placeholders
  - `src/components/generator/forms/SimpleModeForm.tsx` - Alert подсказка
- **Документация**: `docs/SUNO_GENERATION_FIX.md`

### ✨ Added

#### UI/UX Improvements
- Добавлен `customMode` prop в `PromptInput` для адаптивных placeholders
- Inline Alert в SimpleModeForm при наличии lyrics
- Улучшено логирование в edge functions (показываем promptType и preview)

#### Validation
- Валидация в edge function: требуются lyrics для customMode
- Валидация: требуется prompt для simple mode

### 🔧 Changed

#### Logging Enhancements
- `generate-suno/index.ts`: добавлен `willSendToSuno` в логи
- `generation.service.ts`: добавлено логирование режима генерации (simple/custom)

### 📚 Documentation
- ✅ `docs/SUNO_GENERATION_FIX.md` - детальное описание исправления
- ✅ Обновлен `docs/KNOWLEDGE_BASE.md` с правилами Suno API
- ✅ `CHANGELOG.md` - стандартизированный журнал изменений

---

## [2.7.1] - 2025-10-14

### ✨ Added

#### Component Architecture Refactoring
- Разделен монолитный `MusicGeneratorV2` на 9 модульных компонентов:
  - `GeneratorHeader` - header с провайдером и балансом
  - `PromptInput` - input для промпта с AI boost
  - `LyricsInput` - textarea для лирики
  - `SimpleModeForm` - форма простого режима
  - `CustomModeForm` - форма кастомного режима
  - `AdvancedControls` - продвинутые настройки
  - `StyleTagsInput` - управление тегами
  - `AudioReferenceSection` - референсное аудио
  - `types/generator.types.ts` - общие типы

#### Developer Experience
- Добавлен `docs/DEVELOPER_DASHBOARD.md` - центр управления для разработчиков
- Создан `project-management/tasks/STATUS_DASHBOARD.md` - статус задач
- Обновлен `docs/KNOWLEDGE_BASE.md` - база знаний проекта

### 🔧 Changed
- Оптимизирован `MusicGeneratorV2` - теперь использует модульные компоненты
- Улучшена типизация с `GenerationParams` и `GeneratorMode`

### 📚 Documentation
- ✅ `docs/COMPONENT_REFACTORING_PLAN.md` - план рефакторинга
- ✅ `docs/AUDIT_VERSIONING_AND_FIXES.md` - аудит системы версионирования

---

## [2.7.0] - 2025-10-11

### 🔒 Security

#### Database Security Improvements
- Добавлен `SET search_path = 'public'` для всех SECURITY DEFINER functions
- Исправлены RLS политики для предотвращения SQL injection
- Обновлены функции:
  - `increment_view_count`
  - `increment_play_count`
  - `increment_download_count`
  - `decrement_test_credits`
  - `decrement_production_credits`
  - `has_role`
  - `notify_track_liked`

### 🐛 Fixed

#### Critical Bugs
- Исправлен infinite loop в `useTrackSync` hook
- Исправлен `get-balance` Edge Function fallback logic
- Устранены race conditions в polling механизме

#### UI/UX Fixes
- Реализован `onOpenPlayer` в `DetailPanel`
- Удален TODO marker из компонента
- Исправлены адаптивные стили для мобильных устройств

### 🗂️ Repository Reorganization
- Архивированы октябрьские отчеты в `archive/2025-10/`
- Удален устаревший код и deprecated компоненты
- Обновлена структура `project-management/`

### 📚 Documentation
- ✅ Обновлен `README.md` с актуальным статусом
- ✅ Актуализирован `docs/TROUBLESHOOTING.md`
- ✅ Добавлен `archive/MANIFEST.md`

---

## Legend

- 🔥 **Critical** - Критичные исправления и изменения
- ✨ **Added** - Новые функции
- 🔧 **Changed** - Изменения существующих функций
- 🐛 **Fixed** - Исправления багов
- 🔒 **Security** - Исправления безопасности
- 📚 **Documentation** - Обновления документации
- 🗂️ **Repository** - Изменения структуры репозитория
- ⚡ **Performance** - Улучшения производительности

---

**Ссылки:**
- [Unreleased Changes](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/compare/v2.7.2...HEAD)
- [Full Changelog](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/blob/main/CHANGELOG.md)
