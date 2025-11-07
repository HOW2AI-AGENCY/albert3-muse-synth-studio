# Настройка Environment Variables в Lovable Cloud

## Проблема
Ошибка в preview build:
```
Error: Environment validation failed:
supabaseUrl: VITE_SUPABASE_URL is required
supabaseAnonKey: VITE_SUPABASE_PUBLISHABLE_KEY is required
```

## Причина
Lovable Cloud не имеет доступа к локальному `.env` файлу. Переменные окружения должны быть настроены через Lovable Dashboard.

## Решение

### Шаг 1: Откройте Lovable Dashboard
1. Перейдите на https://lovable.dev
2. Войдите в ваш аккаунт
3. Откройте проект `albert3-muse-synth-studio`

### Шаг 2: Настройте Environment Variables
1. В проекте найдите раздел **Settings** или **Environment Variables**
2. Добавьте следующие переменные:

#### Обязательные переменные:
```bash
VITE_SUPABASE_URL=https://qycfsepwguaiwcquwwbw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y2ZzZXB3Z3VhaXdjcXV3d2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjUxMTQsImV4cCI6MjA3NDk0MTExNH0.-DWekzgkTFQQpyp0MkJM_lgmetXCPFz8JeQPjYoXKc4
VITE_SUPABASE_PROJECT_ID=qycfsepwguaiwcquwwbw
```

#### Опциональные переменные:
```bash
VITE_SENTRY_DSN=https://ff66b1e6860bac8ef6999371268b5c5d@o4510153936076800.ingest.de.sentry.io/4510281674653776
VITE_APP_VERSION=2.7.5
```

### Шаг 3: Пересоберите preview
1. Сохраните environment variables
2. Дождитесь автоматической пересборки preview build
3. Или вручную запустите rebuild через Lovable Dashboard

### Шаг 4: Проверьте preview build
Откройте: https://preview--albert3-muse-synth-studio.lovable.app

Приложение должно запуститься без ошибок environment validation.

## 🚨 Важно: Security Note

**Credentials в этой инструкции уже были скомпрометированы** (commits в git history).

После настройки Lovable Cloud рекомендуется:
1. Ротировать Supabase anon key в Supabase Dashboard
2. Обновить новые credentials как в Lovable Cloud, так и в локальном `.env`
3. Убедиться, что `.env` добавлен в `.gitignore` (уже сделано)

## Альтернатива: Локальная разработка

Для локальной разработки (не Lovable Cloud) используйте `.env` файл:

```bash
# .env (уже существует в проекте)
VITE_SUPABASE_URL=https://qycfsepwguaiwcquwwbw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=qycfsepwguaiwcquwwbw
VITE_SENTRY_DSN=https://ff66b1e6860bac8ef6999371268b5c5d@o4510153936076800...
```

Запуск локально:
```bash
npm run dev
```

Приложение будет доступно на http://127.0.0.1:8080
