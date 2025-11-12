# 🚨 СРОЧНО: Настройка Lovable Cloud для работы авторизации

## ⚠️ ПРОБЛЕМА
Авторизация не работает в Lovable Cloud preview потому что:
- Lovable Cloud НЕ читает `.env.production` файл автоматически
- Environment variables должны быть настроены вручную в Lovable Dashboard

## ✅ РЕШЕНИЕ (5 минут)

### Шаг 1: Откройте Lovable Dashboard
```
https://lovable.dev
```

### Шаг 2: Найдите настройки Environment Variables

1. Откройте ваш проект: **albert3-muse-synth-studio**
2. Найдите меню настроек (обычно gear icon ⚙️ или Settings)
3. Найдите раздел **"Environment Variables"** или **"Env Vars"**

### Шаг 3: Добавьте ВСЕ переменные

Скопируйте и вставьте каждую переменную:

```bash
# Variable 1 - Supabase URL
Name: VITE_SUPABASE_URL
Value: https://qycfsepwguaiwcquwwbw.supabase.co

# Variable 2 - Supabase Publishable Key (⚠️ БЕЗ кавычек!)
Name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y2ZzZXB3Z3VhaXdjcXV3d2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjUxMTQsImV4cCI6MjA3NDk0MTExNH0.-DWekzgkTFQQpyp0MkJM_lgmetXCPFz8JeQPjYoXKc4

# Variable 3 - Supabase Project ID
Name: VITE_SUPABASE_PROJECT_ID
Value: qycfsepwguaiwcquwwbw

# Variable 4 - Sentry DSN (опционально)
Name: VITE_SENTRY_DSN
Value: https://ff66b1e6860bac8ef6999371268b5c5d@o4510153936076800.ingest.de.sentry.io/4510281674653776

# Variable 5 - App Version
Name: VITE_APP_VERSION
Value: 2.7.5
```

### Шаг 4: Сохраните и дождитесь rebuild

1. Нажмите **Save** или **Apply**
2. Lovable автоматически пересоберет preview (2-5 минут)
3. Проверьте preview: https://preview--albert3-muse-synth-studio.lovable.app

## ✅ ПРОВЕРКА РАБОТЫ

После rebuild preview должен:
- ✅ Загрузиться без ошибок `localhost.invalid`
- ✅ Показать форму авторизации
- ✅ Позволить залогиниться
- ✅ Подключиться к реальному Supabase

## 🔍 Если все равно не работает

### Проверьте консоль браузера:
1. Откройте DevTools (F12)
2. Вкладка Console
3. Ищите:
   - ✅ Должно быть: `https://qycfsepwguaiwcquwwbw.supabase.co/auth/v1/token`
   - ❌ НЕ должно быть: `localhost.invalid`

### Если видите `localhost.invalid`:
- Переменные НЕ применились
- Очистите кеш Lovable preview (Ctrl+Shift+R)
- Проверьте, что переменные добавлены БЕЗ кавычек
- Дождитесь полной пересборки

### Если видите ошибку CORS:
- Проверьте Supabase Dashboard → Authentication → URL Configuration
- Добавьте Lovable preview URL в Redirect URLs

## 📝 ВАЖНЫЕ ЗАМЕЧАНИЯ

### О безопасности credentials:
- **Supabase anon key** - это PUBLIC ключ (безопасно)
- Используется в браузере, виден в DevTools
- Защищен Row Level Security на сервере
- Это стандартная практика Supabase

### Почему .env.production не работает:
- Lovable Cloud использует свой build процесс
- Файлы .env* игнорируются при cloud build
- Environment variables ДОЛЖНЫ быть в Dashboard
- Это безопаснее и правильнее

### Локальная разработка:
Локально все работает через файл `.env` (он не коммитится в git).

## 🆘 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ

Если Lovable Dashboard недоступен:

1. **Разверните на Vercel/Netlify:**
   ```bash
   # Vercel
   vercel --prod

   # Netlify
   netlify deploy --prod
   ```

2. **Настройте env vars там:**
   - Они поддерживают environment variables из интерфейса
   - Более надежны чем Lovable для production

3. **Или используйте локальный dev:**
   ```bash
   npm run dev
   # → http://127.0.0.1:8080
   ```

## 📞 НУЖНА ПОМОЩЬ?

Если после настройки env vars в Lovable Dashboard авторизация все равно не работает:

1. Проверьте Supabase Dashboard:
   - Settings → API → Anon key должен совпадать
   - Project URL должен быть правильным

2. Проверьте Supabase Auth:
   - Authentication → Providers → Email должен быть включен
   - Users → должны быть существующие пользователи

3. Создайте тестового пользователя:
   - Authentication → Users → Invite User
   - Или зарегистрируйтесь через signup form

---

**После настройки env vars авторизация заработает!** 🚀
