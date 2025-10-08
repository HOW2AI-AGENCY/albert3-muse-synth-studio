# Supabase Functions

## Тестирование Edge Functions

Интеграционные тесты для `generate-suno` находятся в каталоге `supabase/functions/tests` и запускаются в среде Deno. Они используют локальный Supabase, поднятый через Supabase CLI, и полностью мокируют вызовы Suno API.

### Предварительные требования

- [Docker Desktop](https://docs.docker.com/desktop/) (для запуска контейнеров Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) `>= 2.48`
- [Deno](https://deno.land/manual/getting_started/installation) `>= 1.45`

### Подготовка окружения

1. Запустите локальный стек Supabase (CLI автоматически создаст `supabase/.env`):

   ```bash
   npx supabase start
   ```

   > ℹ️ Команда `supabase start` использует те же контейнеры, что и `supabase test`, поэтому подходит как для локальной разработки, так и для CI.

2. Экспортируйте переменные окружения, чтобы тесты могли подключиться к локальному API Supabase:

   ```bash
   set -a
   source supabase/.env
   set +a
   ```

### Запуск тестов

- Через Deno задачи:

  ```bash
  cd supabase/functions
  deno task test
  ```

- Или из корня проекта (npm-скрипт проксирует команду выше):

  ```bash
  npm run supabase:test
  ```

Тесты проверяют следующие сценарии:

- идемпотентные запросы и отсутствие дублей в `ai_jobs`/`tracks`;
- возобновление обработки задач Suno без повторного вызова внешнего API;
- обработку ошибок Suno API с переводом записей `ai_jobs` в состояние `failed`;
- запись лимитов в таблицу `rate_limits` и корректные HTTP-ответы.

### Остановка окружения

После завершения тестов остановите контейнеры Supabase:

```bash
npx supabase stop
```
