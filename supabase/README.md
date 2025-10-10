# Supabase Functions

## Тестирование Edge Functions

Интеграционные тесты для `generate-suno` находятся в каталоге `supabase/functions/tests` и запускаются в среде Deno. Они используют локальный Supabase, поднятый через Supabase CLI, и полностью мокируют вызовы Suno API.

## Обновление секретов Edge Functions

Перед деплоем функций убедитесь, что сервисный ключ Supabase доступен в Edge Functions через секрет `SUPABASE_SERVICE_ROLE_KEY` (при необходимости добавьте алиас `SUPABASE_SERVICE_ROLE`). Это гарантирует корректную запись в таблицах `ai_jobs` и `rate_limits`, а также работу rate limiting.

1. Получите сервисный ключ в **Project Settings → API → Project API keys** (значение `service_role`).
2. Установите или обновите секреты в Supabase CLI:

   ```bash
   supabase secrets set --env-file <(cat <<'EOF'
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_SERVICE_ROLE=your-service-role-key
   EOF
   )
   ```

   > ℹ️ Алиас `SUPABASE_SERVICE_ROLE` необязателен, но позволяет Edge Functions продолжить работу, если старое имя переменной используется в конфигурации.

3. После обновления секретов разверните функции, чтобы окружение получило новые значения:

   ```bash
   supabase functions deploy generate-suno
   # или общий деплой всех функций
   supabase functions deploy --all
   ```

4. Проверьте, что вызовы `supabase.functions.invoke('generate-suno')` возвращают код `200` и создают записи в `ai_jobs`/`rate_limits` (через Supabase Studio или CLI).

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
