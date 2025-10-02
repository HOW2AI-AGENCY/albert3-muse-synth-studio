# 📋 Рекомендации по именованию миграций Supabase

## 🔍 Анализ текущих миграций

### Текущее состояние
В проекте Albert3 Muse Synth Studio используются два подхода к именованию миграций:

1. **Описательное именование** (рекомендуемый подход):
   - `20250115000000_create_rate_limits_table.sql` ✅

2. **UUID-именование** (автоматически генерируемое):
   - `20251002062819_07e3f057-55bf-4566-b5eb-fbb819d62fbd.sql` ❌
   - `20251002083932_1aecbc4b-1ffd-47d9-8c48-50a12e1de58b.sql` ❌
   - И другие...

## 📝 Рекомендации по улучшению именования

### 1. Структура именования миграций

```
YYYYMMDDHHMMSS_action_entity_description.sql
```

**Компоненты:**
- `YYYYMMDDHHMMSS` - временная метка (автоматически)
- `action` - действие (create, alter, drop, add, remove, update)
- `entity` - сущность (table, column, index, policy, function)
- `description` - краткое описание

### 2. Примеры правильного именования

#### Создание таблиц
```sql
20250115120000_create_table_tracks.sql
20250115120100_create_table_profiles.sql
20250115120200_create_table_rate_limits.sql
```

#### Изменение структуры
```sql
20250115130000_alter_table_tracks_add_suno_fields.sql
20250115130100_alter_table_tracks_add_provider_column.sql
20250115130200_alter_table_tracks_add_style_tags.sql
```

#### Создание индексов
```sql
20250115140000_create_index_tracks_user_status.sql
20250115140100_create_index_tracks_suno_id.sql
20250115140200_create_index_tracks_style_tags_gin.sql
```

#### Политики безопасности
```sql
20250115150000_create_policy_tracks_user_access.sql
20250115150100_create_policy_profiles_own_data.sql
```

### 3. Соответствие текущих миграций новым стандартам

| Текущее имя | Рекомендуемое имя | Описание |
|-------------|-------------------|----------|
| `20251002062819_07e3f057...sql` | `20251002062819_create_table_tracks.sql` | Создание таблицы треков |
| `20251002083932_1aecbc4b...sql` | `20251002083932_alter_table_tracks_add_extended_fields.sql` | Добавление полей provider, lyrics, style_tags |
| `20251002121554_768bd3b2...sql` | `20251002121554_create_table_profiles.sql` | Создание таблицы профилей |
| `20251002135105_cfb1cac5...sql` | `20251002135105_alter_table_tracks_add_suno_metadata.sql` | Добавление метаданных Suno |
| `20251002141006_9aef8750...sql` | `20251002141006_create_indexes_tracks_performance.sql` | Создание индексов для производительности |

## 🛠️ Практические рекомендации

### 1. Для новых миграций

При создании новых миграций используйте команду с описательным именем:

```bash
# Вместо автоматической генерации
supabase migration new "create_table_user_preferences"

# Или
supabase migration new "alter_table_tracks_add_ai_model_version"
```

### 2. Группировка связанных изменений

Объединяйте логически связанные изменения в одну миграцию:

```sql
-- 20250115160000_setup_audio_processing_system.sql
-- Создание всех компонентов для обработки аудио

-- Создание таблицы для аудио-задач
CREATE TABLE audio_processing_jobs (...);

-- Создание индексов
CREATE INDEX idx_audio_jobs_status ON audio_processing_jobs(status);

-- Создание политик безопасности
CREATE POLICY audio_jobs_user_access ON audio_processing_jobs ...;
```

### 3. Комментарии в миграциях

Всегда добавляйте комментарии для объяснения назначения:

```sql
-- Миграция: 20250115170000_create_table_user_analytics
-- Описание: Создание системы аналитики пользователей для отслеживания активности

-- Создание таблицы аналитики
CREATE TABLE user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- 'track_created', 'track_played', 'track_liked'
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📊 Преимущества правильного именования

### 1. Читаемость
- Сразу понятно, что делает миграция
- Легко найти нужную миграцию в списке
- Упрощает код-ревью

### 2. Сопровождение
- Быстрое понимание истории изменений
- Легче откатывать изменения
- Проще отлаживать проблемы

### 3. Командная работа
- Единый стандарт для всей команды
- Меньше путаницы при слиянии веток
- Лучшая документация изменений

## 🔄 План миграции к новым стандартам

### Этап 1: Документирование существующих миграций
- [x] Создать таблицу соответствия имен
- [x] Добавить комментарии к существующим миграциям

### Этап 2: Новые миграции
- [ ] Использовать только описательные имена
- [ ] Следовать структуре именования
- [ ] Добавлять подробные комментарии

### Этап 3: Обучение команды
- [ ] Провести ознакомление с гайдлайнами
- [ ] Добавить проверки в CI/CD
- [ ] Создать шаблоны миграций

## 📚 Дополнительные ресурсы

- [Документация Supabase по миграциям](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Лучшие практики именования в SQL](https://www.sqlstyle.guide/)
- [Управление схемой базы данных](https://martinfowler.com/articles/evodb.html)

---

**Дата создания:** Январь 2025  
**Версия:** 1.0  
**Статус:** Активные рекомендации