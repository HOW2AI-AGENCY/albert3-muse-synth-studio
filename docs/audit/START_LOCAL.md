# 🚀 ЗАПУСК ЛОКАЛЬНО (Работает 100%)

## Проблема с Lovable Cloud
Lovable Cloud требует настройки в Dashboard, которая может не работать.
Локальная версия работает СЕЙЧАС с вашим .env файлом.

## ✅ БЫСТРЫЙ СТАРТ (30 секунд)

### 1. Откройте терминал в папке проекта

### 2. Установите зависимости (если еще не установлены)
```bash
npm install
```

### 3. Запустите dev server
```bash
npm run dev
```

### 4. Откройте в браузере
```
http://127.0.0.1:8080
```

## ✅ ПРОВЕРКА

Вы должны увидеть:
- ✅ Приложение загрузилось
- ✅ Форма авторизации
- ✅ В консоли: `https://qycfsepwguaiwcquwwbw.supabase.co` (а НЕ localhost.invalid)
- ✅ Авторизация работает

## 🔐 ДАННЫЕ ДЛЯ ВХОДА

Используйте свои credentials от Supabase проекта:
- Email: ваш email
- Password: ваш password

Или создайте нового пользователя через Supabase Dashboard:
- https://supabase.com/dashboard
- Authentication → Users → Invite User

## 🆘 ЕСЛИ НЕ РАБОТАЕТ

### Ошибка: "command not found: npm"
Установите Node.js:
- https://nodejs.org/ (версия 20.19+)

### Ошибка: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Порт 8080 занят
Измените порт в package.json:
```json
"dev": "vite --host 127.0.0.1 --port 3000"
```

### Ошибка Supabase connection
Проверьте .env файл существует:
```bash
ls -la .env
cat .env
```

Должен содержать:
```
VITE_SUPABASE_URL="https://qycfsepwguaiwcquwwbw.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
```

## 📊 PRODUCTION DEPLOYMENT

Когда все работает локально, можете деплоить на:

### Vercel (Рекомендуется)
```bash
npm install -g vercel
vercel
```

При первом деплое добавьте env vars:
```
VITE_SUPABASE_URL=https://qycfsepwguaiwcquwwbw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=qycfsepwguaiwcquwwbw
VITE_SENTRY_DSN=https://...
VITE_APP_VERSION=2.7.5
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

### Lovable Cloud (когда настроите)
1. Dashboard → Settings → Environment Variables
2. Добавьте все 5 переменных
3. Дождитесь rebuild

---

**ВАЖНО:** Локальная версия использует `.env` файл и работает БЕЗ настройки Dashboard!
