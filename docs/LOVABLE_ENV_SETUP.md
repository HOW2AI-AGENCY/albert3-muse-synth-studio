# Настройка Environment Variables в Lovable Cloud

## ✅ Автоматическая Конфигурация (2025-11-07)

**Проблема решена!** Начиная с commit [fix: load .env.production in all modes for Lovable Cloud], приложение автоматически загружает переменные окружения из `.env.production` во всех режимах (включая preview builds).

### Как это работает

1. `vite.config.ts` загружает `.env.production` как fallback для всех режимов
2. Значения из `.env.production` автоматически доступны в preview builds
3. **Ручная настройка в Lovable Dashboard больше НЕ требуется**

### Что это значит для разработчиков

- ✅ Preview builds работают "из коробки" без дополнительной настройки
- ✅ Локальная разработка использует те же credentials
- ✅ Production builds используют те же credentials
- ⚠️ Все credentials из `.env.production` являются **публичными** (commit в git)

---

## Устаревшая Инструкция (Для справки)

<details>
<summary>Старый метод: Ручная настройка через Lovable Dashboard (больше не нужна)</summary>

### Проблема (до 2025-11-07)
Ошибка в preview build:
```
Error: Environment validation failed:
supabaseUrl: VITE_SUPABASE_URL is required
supabaseAnonKey: VITE_SUPABASE_PUBLISHABLE_KEY is required
```

### Причина
Lovable Cloud не имел доступа к локальному `.env` файлу. Переменные окружения должны были быть настроены через Lovable Dashboard.

### Решение (устаревшее)

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

</details>

---

## Технические Детали

### Vite Configuration

Файл `vite.config.ts` содержит следующую логику:

```typescript
// Load .env.production as fallback for all modes
const env = loadEnv(mode, process.cwd(), '');
const productionEnv = loadEnv('production', process.cwd(), '');

// Merge with production env as fallback
const mergedEnv = { ...productionEnv, ...env };

// Define env vars for client-side code
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(mergedEnv.VITE_SUPABASE_URL),
  'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(mergedEnv.VITE_SUPABASE_PUBLISHABLE_KEY),
  // ... other env vars
}
```

### Порядок загрузки переменных

1. **Production environment** (`.env.production`) загружается первым как базовый набор
2. **Mode-specific environment** (`.env.development`, `.env.local`) перезаписывает production значения если существует
3. Итоговый набор передается в client-side код через `define`

### Безопасность

⚠️ **Важно:** Supabase anon key является **публичным** ключом и безопасен для commit в git. Он используется только для client-side операций и защищен Row Level Security (RLS) в Supabase.

🔒 **Никогда не commit:**
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- API ключи сторонних сервисов
- Приватные токены
