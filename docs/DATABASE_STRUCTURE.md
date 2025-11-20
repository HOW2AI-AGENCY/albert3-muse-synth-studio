# Структура базы данных Albert3 Muse Synth Studio

**Версия:** 2.6.2
**Дата:** 2025-11-20
**СУБД:** PostgreSQL (Supabase)
**Всего таблиц:** 38
**Всего функций:** 13
**Views:** 2

---

## 📊 Обзор архитектуры

Приложение использует **PostgreSQL** через **Supabase BaaS** с следующими ключевыми особенностями:

- **Row Level Security (RLS)** — все таблицы защищены политиками доступа на уровне строк
- **Realtime Subscriptions** — поддержка подписок на изменения в реальном времени
- **Edge Functions** — serverless функции на Deno для интеграции с внешними API
- **Storage Buckets** — хранилище для аудио, обложек и видео
- **Triggers & Functions** — автоматизация логики (счетчики, нормализация данных)

---

## 🗂️ Основные группы таблиц

### 1. **Пользователи и подписки** (Users & Subscriptions)
### 2. **Треки и версии** (Tracks & Versions)
### 3. **Проекты и организация** (Projects & Organization)
### 4. **Генерация и AI** (Generation & AI)
### 5. **Аналитика и мониторинг** (Analytics & Monitoring)
### 6. **Вспомогательные сервисы** (Supporting Services)

---

## 1️⃣ Пользователи и подписки

### **profiles**
Профили пользователей (extends auth.users).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK, ссылка на auth.users |
| `email` | text | Email пользователя |
| `full_name` | text | Полное имя |
| `avatar_url` | text | URL аватара |
| `subscription_plan` | text | Тариф: free/pro/premium |
| `subscription_status` | text | Статус: active/cancelled/expired |
| `subscription_expires_at` | timestamptz | Дата окончания подписки |
| `credits_remaining` | integer | Оставшиеся кредиты |
| `credits_used_today` | integer | Использовано кредитов сегодня |
| `last_credit_reset_at` | timestamptz | Последний сброс счетчика |
| `created_at` | timestamptz | Дата создания |
| `updated_at` | timestamptz | Дата обновления |

**Связи:**
- → `tracks` (1:N) — треки пользователя
- → `music_projects` (1:N) — проекты пользователя
- → `notifications` (1:N) — уведомления
- → `user_roles` (1:N) — роли пользователя

**RLS политики:**
- Пользователь видит только свой профиль
- Публичные профили доступны всем для чтения

---

### **subscription_plans**
Тарифные планы и лимиты.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `display_name` | text | Название тарифа |
| `description` | text | Описание |
| `credits_monthly` | integer | Кредитов в месяц |
| `credits_daily_limit` | integer | Лимит кредитов в день |
| `max_concurrent_generations` | integer | Максимум одновременных генераций |
| `max_projects` | integer | Максимум проектов |
| `max_tracks_per_project` | integer | Максимум треков в проекте |
| `features` | jsonb | Доступные функции |
| `price_monthly` | numeric | Цена в месяц |
| `price_yearly` | numeric | Цена в год |
| `is_active` | boolean | Активен ли план |

**Планы:**
- **free** — 10 треков/месяц, базовые функции
- **pro** — 100 треков/месяц, расширенные функции
- **premium** — без лимитов, все функции

---

### **generation_limits**
Лимиты генераций по пользователям.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `plan_name` | text | Название тарифа |
| `generations_limit_daily` | integer | Лимит генераций в день |
| `generations_used_today` | integer | Использовано сегодня |
| `last_reset_at` | timestamptz | Последний сброс |

**Triggers:**
- Сброс счетчика каждый день в 00:00 UTC

---

### **user_roles**
Роли пользователей (RBAC).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `role` | app_role | Роль: user/admin/moderator |

**Enum app_role:**
- `user` — обычный пользователь
- `admin` — администратор
- `moderator` — модератор

---

## 2️⃣ Треки и версии

### **tracks**
Основная таблица треков (треки = музыкальные композиции).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `title` | text | Название трека |
| `prompt` | text | Промпт для генерации |
| `improved_prompt` | text | Улучшенный промпт (AI) |
| `lyrics` | text | Текст песни |
| `audio_url` | text | URL аудиофайла |
| `video_url` | text | URL видео |
| `cover_url` | text | URL обложки |
| `duration` | integer | Длительность (сек) |
| `duration_seconds` | integer | Длительность (сек, дубликат) |
| `status` | text | pending/processing/completed/failed |
| `error_message` | text | Ошибка (если failed) |
| `progress_percent` | integer | Прогресс генерации (0-100) |
| `provider` | text | Провайдер: suno/mureka/minimax |
| `suno_id` | text | ID в Suno AI |
| `mureka_task_id` | text | ID задачи в Mureka |
| `model_name` | text | Модель генерации |
| `genre` | text | Жанр |
| `mood` | text | Настроение |
| `style_tags` | text[] | Теги стилей |
| `project_id` | uuid | FK → music_projects |
| `persona_id` | uuid | FK → suno_personas |
| `reference_audio_url` | text | URL референсного аудио |
| `source_prompt_id` | uuid | FK → prompt_history |
| `idempotency_key` | text | Ключ идемпотентности |
| `is_public` | boolean | Публичный трек |
| `has_stems` | boolean | Есть ли стемы |
| `has_vocals` | boolean | Есть ли вокал |
| `like_count` | integer | Количество лайков |
| `play_count` | integer | Количество воспроизведений |
| `view_count` | integer | Количество просмотров |
| `download_count` | integer | Количество скачиваний |
| `archived_at` | timestamptz | Дата архивации |
| `archive_scheduled_at` | timestamptz | Запланированная архивация |
| `archived_to_storage` | boolean | Архивирован в storage |
| `storage_audio_url` | text | URL в archive bucket |
| `storage_cover_url` | text | URL обложки в archive |
| `storage_video_url` | text | URL видео в archive |
| `metadata` | jsonb | Дополнительные данные |
| `created_at` | timestamptz | Дата создания |
| `created_at_suno` | timestamptz | Дата создания в Suno |
| `updated_at` | timestamptz | Дата обновления |

**Индексы:**
- `idx_tracks_user_id` — поиск треков по пользователю
- `idx_tracks_status` — фильтрация по статусу
- `idx_tracks_created_at` — сортировка по дате
- `idx_tracks_project_id` — треки проекта
- `idx_tracks_suno_id` — поиск по Suno ID

**RLS политики:**
- Пользователь видит свои треки + публичные треки других
- Только владелец может изменять/удалять

**Триггеры:**
- `update_updated_at` — автообновление updated_at
- `handle_track_archiving` — автоархивация старых треков

---

### **track_versions**
Версии и варианты треков (вариативная генерация).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `parent_track_id` | uuid | FK → tracks |
| `variant_index` | integer | Индекс варианта (0, 1, 2...) |
| `audio_url` | text | URL аудиофайла |
| `video_url` | text | URL видео |
| `cover_url` | text | URL обложки |
| `duration` | integer | Длительность (сек) |
| `lyrics` | text | Текст песни |
| `suno_id` | text | ID в Suno AI |
| `is_primary_variant` | boolean | Основной вариант (master) |
| `is_preferred_variant` | boolean | Предпочитаемый вариант |
| `like_count` | integer | Лайки этой версии |
| `metadata` | jsonb | Метаданные |
| `created_at` | timestamptz | Дата создания |

**Связи:**
- ← `tracks` (N:1) — родительский трек
- → `track_stems` (1:N) — стемы версии
- → `track_version_likes` (1:N) — лайки версии

**Бизнес-логика:**
- При генерации Suno создает 2 варианта (variant_index: 0, 1)
- `is_primary_variant = true` — мастер-версия (синхронизирована с tracks)
- `is_preferred_variant = true` — предпочитаемый пользователем вариант
- При смене предпочитаемой версии данные копируются в tracks

**Функции:**
- `set_master_version(track_id, version_id)` — установить мастер-версию

---

### **track_stems**
Аудио-стемы (разделенные инструменты).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `track_id` | uuid | FK → tracks |
| `version_id` | uuid | FK → track_versions (nullable) |
| `stem_type` | text | vocals/drums/bass/other/instrumental |
| `audio_url` | text | URL аудиофайла стема |
| `separation_mode` | text | Режим: suno_stems/replicate_demucs |
| `suno_task_id` | text | ID задачи в Suno |
| `metadata` | jsonb | Метаданные |
| `created_at` | timestamptz | Дата создания |

**Типы стемов:**
- `vocals` — вокал
- `drums` — ударные
- `bass` — бас
- `other` — прочие инструменты
- `instrumental` — инструментальная версия (без вокала)

**Режимы разделения:**
- `suno_stems` — встроенные стемы Suno
- `replicate_demucs` — Demucs через Replicate

---

### **track_likes**
Лайки треков.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `track_id` | uuid | FK → tracks |
| `created_at` | timestamptz | Дата лайка |

**Индексы:**
- `UNIQUE(user_id, track_id)` — один лайк на трек от пользователя

**Триггеры:**
- `update_track_like_count` — обновляет like_count в tracks

---

### **track_version_likes**
Лайки конкретных версий треков.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `version_id` | uuid | FK → track_versions |
| `created_at` | timestamptz | Дата лайка |

**Индексы:**
- `UNIQUE(user_id, version_id)` — один лайк на версию от пользователя

---

### **track_retry_attempts**
Попытки повторной генерации треков.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `track_id` | uuid | FK → tracks |
| `attempt_number` | integer | Номер попытки |
| `attempted_at` | timestamptz | Время попытки |
| `error_message` | text | Ошибка (если неудачно) |

**Логика:**
- Максимум 3 попытки повторной генерации
- Автоматический retry через Edge Function webhook

---

### **track_section_replacements**
Замена секций трека (редактирование частей).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `parent_track_id` | uuid | FK → tracks |
| `version_id` | uuid | FK → track_versions (nullable) |
| `replaced_start_s` | numeric | Начало секции (сек) |
| `replaced_end_s` | numeric | Конец секции (сек) |
| `prompt` | text | Промпт для новой секции |
| `tags` | text | Теги стилей |
| `negative_tags` | text | Исключаемые теги |
| `replacement_audio_url` | text | URL новой секции |
| `status` | text | pending/processing/completed/failed |
| `suno_task_id` | text | ID задачи в Suno |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

**Функция:**
- Позволяет заменить часть трека новой генерацией
- Используется Suno API: `/api/generate/replace`

---

### **track_archiving_jobs**
Задачи архивации треков.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `track_id` | uuid | FK → tracks |
| `status` | text | pending/processing/completed/failed |
| `original_audio_url` | text | Оригинальный URL аудио |
| `original_cover_url` | text | Оригинальный URL обложки |
| `original_video_url` | text | Оригинальный URL видео |
| `archived_audio_url` | text | URL в archive bucket |
| `archived_cover_url` | text | URL обложки в archive |
| `archived_video_url` | text | URL видео в archive |
| `started_at` | timestamptz | Начало архивации |
| `completed_at` | timestamptz | Завершение |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

**Логика архивации:**
1. Треки старше 90 дней автоматически помечаются для архивации
2. Edge Function копирует файлы из public bucket в archive bucket
3. Обновляет tracks.storage_* URLs
4. Удаляет оригиналы из public bucket (экономия места)

---

## 3️⃣ Проекты и организация

### **music_projects**
Музыкальные проекты (альбомы/коллекции).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `name` | text | Название проекта |
| `description` | text | Описание |
| `cover_url` | text | URL обложки |
| `genre` | text | Жанр |
| `mood` | text | Настроение |
| `target_tracks_count` | integer | Планируемое кол-во треков |
| `completed_tracks` | integer | Завершено треков |
| `status` | text | planning/in_progress/completed |
| `is_public` | boolean | Публичный проект |
| `concept_description` | text | Концепция проекта |
| `ai_context` | jsonb | AI-контекст для генерации |
| `ai_context_version` | integer | Версия AI-контекста |
| `ai_context_updated_at` | timestamptz | Обновление AI-контекста |
| `ai_generation_params` | jsonb | Параметры генерации AI |
| `created_with_ai` | boolean | Создан с помощью AI |
| `metadata` | jsonb | Метаданные |
| `created_at` | timestamptz | Дата создания |
| `updated_at` | timestamptz | Дата обновления |

**Связи:**
- ← `profiles` (N:1) — владелец
- → `project_tracks` (1:N) — треки проекта
- → `project_prompts` (1:N) — промпты проекта

**Индексы:**
- `idx_music_projects_user_id` — проекты пользователя
- `idx_music_projects_status` — фильтр по статусу

---

### **project_tracks**
Связь проектов и треков (many-to-many).

| Поле | Тип | Описание |
|------|-----|----------|
| `project_id` | uuid | PK, FK → music_projects |
| `track_id` | uuid | PK, FK → tracks |
| `position` | integer | Порядок трека в проекте |
| `added_at` | timestamptz | Дата добавления |
| `added_by` | uuid | FK → profiles (кто добавил) |

**Индексы:**
- `PRIMARY KEY (project_id, track_id)`
- `idx_project_tracks_position` — сортировка по порядку

---

### **project_prompts**
Шаблоны промптов для проектов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `project_id` | uuid | FK → music_projects (nullable) |
| `user_id` | uuid | FK → profiles |
| `title` | text | Название шаблона |
| `content` | text | Текст промпта |
| `category` | text | Категория: melody/lyrics/style |
| `tags` | text[] | Теги |
| `is_favorite` | boolean | Избранный шаблон |
| `usage_count` | integer | Счетчик использований |
| `last_used_at` | timestamptz | Последнее использование |
| `metadata` | jsonb | Метаданные |

---

### **cloud_folders**
Папки для организации файлов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `name` | text | Название папки |
| `parent_id` | uuid | FK → cloud_folders (вложенность) |
| `category` | text | audio/projects/samples |
| `icon` | text | Иконка папки |
| `color` | text | Цвет папки |
| `is_favorite` | boolean | Избранная папка |
| `metadata` | jsonb | Метаданные |

**Структура:**
- Поддержка вложенных папок через parent_id
- Используется для audio_library

---

## 4️⃣ Генерация и AI

### **prompt_history**
История промптов для генерации.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `prompt` | text | Текст промпта |
| `lyrics` | text | Текст песни |
| `genre` | text | Жанр |
| `mood` | text | Настроение |
| `tags` | text[] | Теги стилей |
| `model_version` | text | Версия модели |
| `provider` | text | Провайдер (suno/mureka) |
| `generation_status` | text | success/failed |
| `generation_time_ms` | integer | Время генерации (мс) |
| `is_template` | boolean | Сохранен как шаблон |
| `usage_count` | integer | Счетчик использований |
| `last_used_at` | timestamptz | Последнее использование |
| `metadata` | jsonb | Метаданные |

**Индексы:**
- `idx_prompt_history_user_id` — история пользователя
- `idx_prompt_history_created_at` — сортировка по дате

---

### **lyrics_jobs**
Задачи генерации текстов песен.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `prompt` | text | Промпт для генерации текста |
| `base_lyrics` | text | Базовый текст (для расширения) |
| `is_extension` | boolean | Расширение текста |
| `provider` | text | Провайдер: suno/openai |
| `status` | text | pending/processing/completed/failed |
| `suno_task_id` | text | ID задачи в Suno |
| `mureka_task_id` | text | ID задачи в Mureka |
| `call_strategy` | text | polling/webhook |
| `callback_url` | text | URL для webhook |
| `initial_response` | jsonb | Начальный ответ API |
| `last_poll_response` | jsonb | Последний ответ опроса |
| `last_callback` | jsonb | Последний webhook |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

**Связи:**
- → `lyrics_variants` (1:N) — варианты текстов

---

### **lyrics_variants**
Варианты текстов песен.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `job_id` | uuid | FK → lyrics_jobs |
| `variant_index` | integer | Индекс варианта (0, 1, 2...) |
| `title` | text | Название |
| `content` | text | Текст песни |
| `status` | text | pending/completed |
| `error_message` | text | Ошибка |

---

### **saved_lyrics**
Сохраненные тексты песен.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `job_id` | uuid | FK → lyrics_jobs (nullable) |
| `title` | text | Название |
| `content` | text | Текст песни |
| `genre` | text | Жанр |
| `mood` | text | Настроение |
| `language` | text | Язык |
| `theme` | text | Тема |
| `folder` | text | Папка |
| `tags` | text[] | Теги |
| `is_favorite` | boolean | Избранный |
| `usage_count` | integer | Счетчик использований |
| `last_used_at` | timestamptz | Последнее использование |
| `metadata` | jsonb | Метаданные |

---

### **lyrics_generation_log**
Лог генераций текстов песен.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `prompt` | text | Промпт |
| `status` | text | success/failed |
| `generated_title` | text | Сгенерированный заголовок |
| `generated_lyrics` | text | Сгенерированный текст |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

---

### **suno_personas**
Персоны для генерации (голосовые профили).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `project_id` | uuid | FK → music_projects (nullable) |
| `name` | text | Название персоны |
| `description` | text | Описание |
| `cover_image_url` | text | URL обложки |
| `source_track_id` | uuid | FK → tracks (источник голоса) |
| `source_music_index` | integer | Индекс музыки для голоса |
| `suno_persona_id` | text | ID персоны в Suno |
| `is_public` | boolean | Публичная персона |
| `last_used_at` | timestamptz | Последнее использование |
| `usage_count` | integer | Счетчик использований |
| `metadata` | jsonb | Метаданные |

**Функция:**
- Позволяет создать голосовой профиль из существующего трека
- Используется для генерации новых треков с этим голосом

---

### **song_descriptions**
AI-описания аудиофайлов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `audio_file_url` | text | URL аудиофайла |
| `ai_description` | text | AI-описание |
| `detected_genre` | text | Определенный жанр |
| `detected_mood` | text | Определенное настроение |
| `detected_instruments` | text[] | Определенные инструменты |
| `energy_level` | numeric | Уровень энергии (0-1) |
| `danceability` | numeric | Танцевальность (0-1) |
| `tempo` | integer | Темп (BPM) |
| `key` | text | Тональность |
| `time_signature` | text | Размер |
| `vocal_presence` | text | none/low/medium/high |
| `fal_request_id` | text | ID запроса в FAL AI |
| `status` | text | pending/completed/failed |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

**Провайдер:** FAL AI (Music Description API)

---

### **song_recognitions**
Распознавание музыки (Shazam-like).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `audio_file_url` | text | URL аудиофайла |
| `recognized_title` | text | Распознанное название |
| `recognized_artist` | text | Распознанный исполнитель |
| `recognized_album` | text | Распознанный альбом |
| `confidence_score` | numeric | Уровень уверенности (0-1) |
| `mureka_task_id` | text | ID задачи в Mureka |
| `mureka_file_id` | text | ID файла в Mureka |
| `fal_request_id` | text | ID запроса в FAL AI |
| `status` | text | pending/completed/failed |
| `error_message` | text | Ошибка |
| `external_ids` | jsonb | Внешние ID (Spotify, Apple Music) |
| `metadata` | jsonb | Метаданные |

**Провайдер:** Mureka API (Music Recognition)

---

### **music_classifications**
Классификация музыки (жанры, инструменты).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `track_id` | uuid | FK → tracks |
| `classifier_type` | text | Тип: genre/instrument/mood |
| `classifier_version` | text | Версия классификатора |
| `genres_ranked` | jsonb | Ранжированные жанры |
| `instruments_detected` | text[] | Обнаруженные инструменты |
| `instruments_ranked` | jsonb | Ранжированные инструменты |
| `mood_detected` | text | Обнаруженное настроение |
| `embeddings` | jsonb | Векторные эмбеддинги |
| `confidence_score` | numeric | Уровень уверенности (0-1) |
| `visualization_url` | text | URL визуализации |
| `status` | text | pending/completed/failed |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

---

### **classification_jobs**
Задачи классификации музыки.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `classification_id` | uuid | FK → music_classifications |
| `classifier_type` | text | Тип классификатора |
| `classifier_config` | jsonb | Конфигурация |
| `input_audio_url` | text | URL входного аудио |
| `output_visualization_url` | text | URL визуализации |
| `raw_output` | jsonb | Сырой вывод модели |
| `replicate_prediction_id` | text | ID предсказания в Replicate |
| `status` | text | pending/processing/completed/failed |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

**Провайдер:** Replicate API (Music Classification Models)

---

### **audio_upscale_jobs**
Задачи апскейлинга аудио (улучшение качества).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `track_id` | uuid | FK → tracks (nullable) |
| `input_audio_url` | text | URL входного аудио |
| `output_audio_url` | text | URL выходного аудио |
| `model_version` | text | Версия модели |
| `guidance_scale` | numeric | Guidance scale (diffusion) |
| `ddim_steps` | integer | DDIM steps (diffusion) |
| `seed` | integer | Random seed |
| `truncated_batches` | boolean | Truncated batches |
| `replicate_prediction_id` | text | ID предсказания в Replicate |
| `status` | text | pending/processing/completed/failed |
| `error_message` | text | Ошибка |
| `completed_at` | timestamptz | Дата завершения |
| `metadata` | jsonb | Метаданные |

**Модели:**
- `stable-audio-open` — Stability AI (diffusion-based upscaler)
- `audioldm2` — AudioLDM2 (latent diffusion)

---

### **wav_jobs**
Задачи конвертации в WAV.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `track_id` | uuid | FK → tracks |
| `audio_id` | text | ID аудио для конвертации |
| `status` | text | pending/processing/completed/failed |
| `suno_task_id` | text | ID задачи в Suno |
| `callback_url` | text | URL для webhook |
| `wav_url` | text | URL WAV файла |
| `error_message` | text | Ошибка |
| `metadata` | jsonb | Метаданные |

---

## 5️⃣ Аналитика и мониторинг

### **analytics_events**
События аналитики.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles (nullable) |
| `track_id` | uuid | FK → tracks (nullable) |
| `event_type` | text | Тип события |
| `event_data` | jsonb | Данные события |
| `created_at` | timestamptz | Дата события |

**Типы событий:**
- `track_play` — воспроизведение трека
- `track_download` — скачивание трека
- `track_share` — поделиться треком
- `track_like` — лайк трека
- `generation_started` — начало генерации
- `generation_completed` — завершение генерации
- `generation_failed` — ошибка генерации
- `page_view` — просмотр страницы
- `button_click` — клик по кнопке

**Индексы:**
- `idx_analytics_events_event_type` — фильтр по типу
- `idx_analytics_events_created_at` — сортировка по дате

---

### **callback_logs**
Логи webhook callbacks.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `track_id` | uuid | FK → tracks (nullable) |
| `callback_type` | text | Тип callback: suno/mureka/fal |
| `payload` | jsonb | Полезная нагрузка |
| `error_message` | text | Ошибка |
| `created_at` | timestamptz | Дата |

**Callback types:**
- `suno_generation` — webhook от Suno AI
- `suno_stems` — webhook стемов Suno
- `mureka_recognition` — webhook от Mureka
- `fal_description` — webhook от FAL AI

---

### **notifications**
Уведомления пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `type` | text | Тип: info/success/warning/error |
| `title` | text | Заголовок |
| `message` | text | Сообщение |
| `link` | text | Ссылка (nullable) |
| `read` | boolean | Прочитано |
| `created_at` | timestamptz | Дата создания |
| `updated_at` | timestamptz | Дата обновления |

**Индексы:**
- `idx_notifications_user_id_read` — непрочитанные уведомления пользователя

---

### **rate_limit_buckets**
Rate limiting (ограничение частоты запросов).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `key` | text | Ключ (user_id:endpoint) |
| `tokens` | integer | Оставшиеся токены |
| `window_start` | bigint | Начало окна (timestamp) |
| `last_refill` | bigint | Последнее пополнение |
| `last_request` | bigint | Последний запрос |

**Алгоритм:** Token Bucket

**Лимиты:**
- `generate-music` — 10 запросов/мин
- `generate-lyrics` — 20 запросов/мин
- `api-general` — 100 запросов/мин

---

## 6️⃣ Вспомогательные сервисы

### **audio_library**
Библиотека аудиофайлов пользователя.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `project_id` | uuid | FK → music_projects (nullable) |
| `parent_folder_id` | uuid | FK → cloud_folders (nullable) |
| `file_name` | text | Имя файла |
| `file_url` | text | URL файла |
| `file_size` | integer | Размер файла (байты) |
| `duration_seconds` | integer | Длительность (сек) |
| `source_type` | text | upload/generated/imported |
| `category` | text | sample/loop/vocal/instrumental |
| `folder` | text | Папка |
| `description` | text | Описание |
| `tags` | text[] | Теги |
| `bpm` | integer | BPM (темп) |
| `key` | text | Тональность |
| `is_favorite` | boolean | Избранный |
| `usage_count` | integer | Счетчик использований |
| `last_used_at` | timestamptz | Последнее использование |
| `analysis_status` | text | pending/completed/failed |
| `analysis_data` | jsonb | Результаты анализа |
| `recognized_song_id` | uuid | FK → song_recognitions |
| `source_metadata` | jsonb | Метаданные источника |

---

### **daw_projects**
DAW проекты (Digital Audio Workstation).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles |
| `name` | text | Название проекта |
| `description` | text | Описание |
| `bpm` | integer | BPM (темп) |
| `duration_seconds` | integer | Длительность (сек) |
| `data` | jsonb | Данные проекта (треки, клипы, эффекты) |
| `thumbnail_url` | text | URL миниатюры |
| `is_public` | boolean | Публичный проект |
| `last_saved_at` | timestamptz | Последнее сохранение |
| `metadata` | jsonb | Метаданные |

**Структура data:**
```json
{
  "tracks": [
    {
      "id": "track-1",
      "name": "Drums",
      "clips": [
        {
          "id": "clip-1",
          "audioUrl": "...",
          "startTime": 0,
          "duration": 120,
          "volume": 0.8,
          "effects": []
        }
      ]
    }
  ],
  "timeline": {
    "zoom": 1.0,
    "scrollPosition": 0
  }
}
```

---

### **app_settings**
Настройки приложения (key-value store).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `key` | text | UNIQUE — ключ настройки |
| `value` | jsonb | Значение |
| `created_at` | timestamptz | Дата создания |
| `updated_at` | timestamptz | Дата обновления |

**Примеры настроек:**
- `maintenance_mode` — режим обслуживания
- `feature_flags` — флаги функций
- `provider_config` — конфигурация провайдеров
- `rate_limits` — лимиты запросов

---

## 📊 Views (Представления)

### **prompt_statistics** (VIEW)
Статистика по промптам.

Агрегирует данные из:
- `prompt_history` — история промптов
- `tracks` — треки
- Группировка по промпту, жанру, тегам
- Счетчики использований, успешных генераций

**Поля:**
- `prompt` — текст промпта
- `genre` — жанр
- `tags` — теги
- `usage_count` — кол-во использований
- `success_count` — кол-во успешных генераций
- `avg_generation_time_ms` — среднее время генерации
- `last_used_at` — последнее использование

---

### **tracks_with_timestamped_lyrics** (VIEW)
Треки с временными метками текстов песен.

Выбирает треки, у которых есть timestamped_lyrics в metadata.

**Поля:**
- `id` — ID трека
- `title` — название
- `audio_url` — URL аудио
- `lyrics` — текст песни
- `has_timestamped_lyrics` — boolean
- `timestamped_lyrics` — jsonb с метками времени

**Структура timestamped_lyrics:**
```json
[
  {
    "start": 0.0,
    "end": 2.5,
    "text": "I woke up this morning"
  },
  {
    "start": 2.5,
    "end": 5.0,
    "text": "With sunshine on my face"
  }
]
```

---

## ⚙️ Functions (Функции)

### **decrement_production_credits(user_uuid, amount)**
Списание продакшн кредитов.

**Параметры:**
- `user_uuid` — uuid пользователя
- `amount` — кол-во кредитов

**Логика:**
- Проверяет лимиты
- Списывает кредиты из profiles.credits_remaining
- Увеличивает profiles.credits_used_today
- Логирует операцию

---

### **decrement_test_credits(user_uuid, amount)**
Списание тестовых кредитов (sandbox).

---

### **increment_generation_usage(user_uuid)**
Увеличение счетчика генераций.

**Логика:**
- Увеличивает generation_limits.generations_used_today
- Проверяет лимиты
- Обновляет last_reset_at если новый день

---

### **increment_download_count(track_uuid)**
Увеличение счетчика скачиваний трека.

---

### **batch_increment_counter(counter_name, amount)**
Батчевое увеличение счетчиков (для производительности).

---

### **is_version_liked(version_uuid, user_uuid) → boolean**
Проверка, лайкнул ли пользователь версию трека.

---

### **mark_track_archived(track_uuid)**
Пометить трек как архивный.

**Логика:**
- Устанавливает tracks.archived_at = NOW()
- Устанавливает tracks.archived_to_storage = true

---

### **get_project_details(project_uuid) → jsonb**
Получить детали проекта с треками.

**Возвращает:**
```json
{
  "id": "...",
  "name": "...",
  "tracks": [
    {
      "id": "...",
      "title": "...",
      "position": 1
    }
  ]
}
```

---

### **get_project_stats(project_uuid) → jsonb**
Статистика проекта.

**Возвращает:**
```json
{
  "tracks_count": 10,
  "completed_tracks": 8,
  "total_duration_seconds": 1800,
  "total_likes": 50,
  "total_plays": 200
}
```

---

### **get_tracks_needing_archiving() → SETOF tracks**
Получить треки для архивации.

**Критерии:**
- Старше 90 дней
- Не архивированы (archived_at IS NULL)
- Статус: completed
- Не публичные ИЛИ с 0 воспроизведений

---

### **get_user_mureka_stats(user_uuid) → jsonb**
Статистика использования Mureka.

---

### **get_analytics_archive_statistics() → jsonb**
Статистика архивации.

---

### **get_analytics_generations_daily() → TABLE**
Статистика генераций по дням.

---

### **get_analytics_top_genres() → TABLE**
Топ-жанров.

---

### **get_analytics_user_stats(user_uuid) → jsonb**
Статистика пользователя.

---

### **set_master_version(track_uuid, version_uuid)**
Установить мастер-версию трека.

**Логика:**
1. Снимает is_primary_variant со всех версий трека
2. Устанавливает is_primary_variant = true для выбранной версии
3. Копирует данные версии (audio_url, cover_url, lyrics, duration) в tracks

---

### **update_track_video_metadata(track_uuid, video_url, metadata)**
Обновить метаданные видео трека.

---

## 🔐 Row Level Security (RLS)

### Политики для profiles:

**SELECT:**
- Пользователь видит свой профиль
- Публичные поля всех профилей доступны всем

**INSERT:**
- Запрещено (создается через trigger auth.users)

**UPDATE:**
- Пользователь может изменять свой профиль
- Администратор может изменять любые профили

**DELETE:**
- Запрещено

---

### Политики для tracks:

**SELECT:**
- Пользователь видит свои треки
- Все видят публичные треки (is_public = true)

**INSERT:**
- Пользователь может создавать свои треки

**UPDATE:**
- Пользователь может изменять свои треки
- Модератор может изменять любые треки

**DELETE:**
- Пользователь может удалять свои треки
- Администратор может удалять любые треки

---

### Политики для music_projects:

**SELECT:**
- Пользователь видит свои проекты
- Все видят публичные проекты (is_public = true)

**INSERT:**
- Пользователь может создавать свои проекты

**UPDATE:**
- Пользователь может изменять свои проекты

**DELETE:**
- Пользователь может удалять свои проекты

---

### Общий принцип RLS:
- Пользователь имеет полный доступ к своим данным
- Публичные данные доступны всем для чтения
- Администраторы и модераторы имеют расширенные права

---

## 🔄 Триггеры

### **update_updated_at**
Автоматическое обновление updated_at при изменении строки.

**Таблицы:**
- tracks
- profiles
- music_projects
- и др.

---

### **update_track_like_count**
Обновление like_count при добавлении/удалении лайка.

**AFTER INSERT/DELETE on track_likes:**
```sql
UPDATE tracks
SET like_count = (
  SELECT COUNT(*) FROM track_likes WHERE track_id = NEW.track_id
)
WHERE id = NEW.track_id;
```

---

### **update_version_like_count**
Обновление like_count для версий треков.

**AFTER INSERT/DELETE on track_version_likes:**
```sql
UPDATE track_versions
SET like_count = (
  SELECT COUNT(*) FROM track_version_likes WHERE version_id = NEW.version_id
)
WHERE id = NEW.version_id;
```

---

### **handle_track_archiving**
Автоматическая пометка треков для архивации.

**AFTER INSERT/UPDATE on tracks:**
```sql
IF (NEW.created_at < NOW() - INTERVAL '90 days')
   AND NEW.archived_at IS NULL
   AND NEW.status = 'completed'
THEN
  NEW.archive_scheduled_at = NOW() + INTERVAL '7 days';
END IF;
```

---

### **create_profile_on_signup**
Создание профиля при регистрации пользователя.

**AFTER INSERT on auth.users:**
```sql
INSERT INTO public.profiles (id, email, created_at)
VALUES (NEW.id, NEW.email, NOW());
```

---

### **reset_daily_limits**
Сброс дневных лимитов в 00:00 UTC.

**CRON Job (ежедневно):**
```sql
UPDATE profiles
SET
  credits_used_today = 0,
  last_credit_reset_at = NOW();

UPDATE generation_limits
SET
  generations_used_today = 0,
  last_reset_at = NOW();
```

---

## 📦 Storage Buckets

### **tracks** (public)
Хранит аудиофайлы треков, обложки, видео.

**Структура:**
```
tracks/
  {user_id}/
    {track_id}/
      audio.mp3
      cover.jpg
      video.mp4
```

**RLS:**
- Владелец может загружать/удалять
- Все могут читать публичные файлы

---

### **tracks-archive** (private)
Архив старых треков.

**Структура:**
```
tracks-archive/
  {user_id}/
    {track_id}/
      audio.mp3
      cover.jpg
      video.mp4
```

**RLS:**
- Только владелец может читать
- Только система может загружать/удалять

---

### **stems** (public)
Аудио-стемы треков.

**Структура:**
```
stems/
  {track_id}/
    {stem_id}/
      vocals.mp3
      drums.mp3
      bass.mp3
      other.mp3
```

---

### **audio-library** (private)
Аудиотека пользователя.

**Структура:**
```
audio-library/
  {user_id}/
    {folder}/
      file.mp3
```

---

### **covers** (public)
Обложки альбомов/проектов.

**Структура:**
```
covers/
  projects/
    {project_id}.jpg
  profiles/
    {user_id}.jpg
```

---

## 🔍 Индексы

### **Основные индексы:**

```sql
-- tracks
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_tracks_project_id ON tracks(project_id);
CREATE INDEX idx_tracks_is_public ON tracks(is_public) WHERE is_public = true;

-- profiles
CREATE INDEX idx_profiles_subscription_plan ON profiles(subscription_plan);
CREATE INDEX idx_profiles_email ON profiles(email);

-- music_projects
CREATE INDEX idx_music_projects_user_id ON music_projects(user_id);
CREATE INDEX idx_music_projects_status ON music_projects(status);

-- track_versions
CREATE INDEX idx_track_versions_parent_track_id ON track_versions(parent_track_id);
CREATE INDEX idx_track_versions_is_primary ON track_versions(is_primary_variant) WHERE is_primary_variant = true;

-- analytics_events
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);

-- prompt_history
CREATE INDEX idx_prompt_history_user_id ON prompt_history(user_id);
CREATE INDEX idx_prompt_history_created_at ON prompt_history(created_at DESC);
```

---

## 📈 Статистика базы данных

**Размер БД (оценка):**
- Таблицы: ~38
- Функции: ~13
- Триггеры: ~10
- Views: ~2
- Индексы: ~50+
- RLS политики: ~100+

**Типичные объемы данных:**
- tracks: 10,000 - 100,000 строк на пользователя
- analytics_events: миллионы строк
- profiles: ~10,000 - 100,000
- music_projects: ~1,000 - 10,000

**Оптимизации:**
- Партиционирование analytics_events по дате
- Архивация старых треков → tracks-archive bucket
- Кэширование статистики в Redis
- CDN для статических файлов

---

## 🔄 Backup и Disaster Recovery

**Backup стратегия:**
- **Автоматический backup** — ежедневно (Supabase)
- **Point-in-time recovery** — до 7 дней назад
- **Manual snapshots** — перед major updates
- **Storage replication** — 3 копии (Supabase S3)

**Recovery Time Objective (RTO):** < 1 час
**Recovery Point Objective (RPO):** < 5 минут

---

## 📚 Миграции

Миграции хранятся в `supabase/migrations/`.

**Нейминг:**
```
YYYYMMDDHHMMSS_descriptive-name.sql
```

**Примеры:**
- `20251103100014_add_track_versions.sql`
- `20251104000000_add_track_version_likes.sql`
- `20251110130625_add_version_likes_trigger.sql`

**Применение миграций:**
```bash
supabase db push
supabase db reset  # для полного пересоздания
```

---

## 🔗 Связи между таблицами (ER-диаграмма в тексте)

```
profiles (1) ───< (N) tracks
profiles (1) ───< (N) music_projects
profiles (1) ───< (N) notifications
profiles (1) ───< (N) user_roles

tracks (1) ───< (N) track_versions
tracks (1) ───< (N) track_stems
tracks (1) ───< (N) track_likes
tracks (1) ───< (N) analytics_events
tracks (N) ───> (1) music_projects (nullable)
tracks (N) ───> (1) suno_personas (nullable)

track_versions (1) ───< (N) track_version_likes
track_versions (1) ───< (N) track_stems

music_projects (N) ───< (N) tracks via project_tracks
music_projects (1) ───< (N) project_prompts

lyrics_jobs (1) ───< (N) lyrics_variants
```

---

## ✅ Заключение

База данных Albert3 Muse Synth Studio спроектирована для:
- **Масштабируемости** — миллионы треков и пользователей
- **Производительности** — оптимизированные индексы и RLS политики
- **Безопасности** — Row Level Security на всех таблицах
- **Гибкости** — JSONB метаданные для расширяемости
- **Надежности** — автоматические backup и recovery

**Ключевые преимущества:**
- Версионирование треков (track_versions)
- Автоматическая архивация старых треков
- Поддержка нескольких AI-провайдеров
- Богатая аналитика и мониторинг
- Гибкая система подписок и лимитов

---

**Версия документа:** 1.0.0
**Последнее обновление:** 2025-11-20
**Автор:** HOW2AI-AGENCY Development Team
