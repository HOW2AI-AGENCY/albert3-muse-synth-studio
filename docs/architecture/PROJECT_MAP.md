# 🗺️ Карта проекта: Albert3 Muse Synth Studio

Этот документ даёт целостное представление о структуре репозитория, ключевых подсистемах, потоках данных и точках интеграции. Он служит быстрым ориентиром для разработчиков, аналитиков и DevOps.

## 📁 Структура репозитория (высокоуровнево)

- `src/` — фронтенд (React + Vite + TS)
  - `components/` — UI-компоненты (player, tracks, auth и др.)
  - `hooks/` — бизнес-логика клиента (tracks, generation, recovery, sync)
  - `services/` — сервисный слой (`api.service.ts`, `analytics.service.ts`)
  - `integrations/` — клиенты внешних систем (`supabase/client.ts`)
  - `contexts/` — контексты приложения (Audio Player, UI state)
  - `utils/` — утилиты (версии треков, форматирование, guards)
- `supabase/` — бэкенд (БД + Edge Functions)
  - `functions/` — микросервисы: `generate-suno`, `generate-music`, `separate-stems`, `generate-lyrics`, `sync-lyrics-job`, `sync-stem-job`, `get-balance`, `improve-prompt`
  - `functions/_shared/` — общие модули: `security.ts`, `cors.ts`, `supabase.ts`, `suno.ts`, `validation.ts`, `logger.ts`, `storage.ts`
  - `migrations/` — миграции схемы БД, индексы, backfill
- `docs/` — документация (архитектура, API, диаграммы, гайды)
- `project-management/` — управление проектом (задачи, отчёты, навигация)

## 🧱 Слои системы

- Presentation (React-компоненты, страницы)
- Business Logic (hooks, сервисы, utils)
- Data Access (API Service, Supabase client)
- Infrastructure (Supabase DB/Storage/Auth/Functions, внешние API)

## 🔌 Интеграции и функции

- Suno API — генерация музыки/лирических данных, разделение на стемы
- Replicate — альтернативный провайдер генерации музыки
- Lovable AI — улучшение промптов и рекомендация стилей
- Edge Function Security — rate limit, валидация JWT, заголовки безопасности

## 🎵 Домен «Треки»

- `tracks` — базовые метаданные трека (provider, style_tags, vocals)
- `track_versions` — версии и рендеры трека
- `track_stems` — аудио-стемы (vocals/drums/etc.)
- `track_likes` — отметки «нравится»
- `play_analytics` — события воспроизведения

## 🔁 Основные потоки

- Генерация трека:
  - UI → Hook (`useMusicGeneration`) → `ApiService.generateMusic`
  - Supabase Function (`generate-suno`|`generate-music`) → внешний API
  - Сохранение метаданных → `tracks`/`track_versions` → уведомление UI

- Разделение на стемы:
  - UI → `ApiService.separateStems` → Supabase Function `separate-stems`
  - Хранение файлов в Storage, запись в `track_stems`

- Лирика и улучшение промптов:
  - UI → `ApiService.generateLyrics`/`improvePrompt` → соответствующие функции

- Воспроизведение и аналитика:
  - Player Context → события → `analytics.service.ts` → Supabase → `play_analytics`

## 🔐 Безопасность

- JWT аутентификация через Supabase; RLS на таблицах
- Rate limiting и CORS на уровне Edge Functions
- Валидация входных данных (Zod-схемы в `_shared/validation.ts`)

## 🚀 CI/CD и окружения

- GitHub Actions → Build & Test → Vercel → обновление Supabase
- Среды: Dev, Staging, Production

## 🧭 Навигация по артефактам

- Архитектура: `docs/architecture/ARCHITECTURE.md`
- Диаграммы: `docs/ARCHITECTURE_DIAGRAMS.md`
- API: `docs/api/API.md`
- Граф знаний: `docs/architecture/KNOWLEDGE_GRAPH.md`

— Обновлено: 09.10.2025