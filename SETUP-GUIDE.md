# 🚀 Подробное руководство по установке Albert3 Muse Synth Studio

Это подробное руководство поможет вам настроить и запустить Albert3 Muse Synth Studio на вашем компьютере.

## 📋 Содержание

- [Системные требования](#системные-требования)
- [Установка Node.js](#установка-nodejs)
- [Клонирование проекта](#клонирование-проекта)
- [Настройка переменных окружения](#настройка-переменных-окружения)
- [Настройка Supabase](#настройка-supabase)
- [Настройка AI сервисов](#настройка-ai-сервисов)
- [Установка зависимостей](#установка-зависимостей)
- [Запуск проекта](#запуск-проекта)
- [Решение проблем](#решение-проблем)

## 💻 Системные требования

### Минимальные требования
- **Операционная система**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 4 GB (рекомендуется 8 GB+)
- **Свободное место**: 2 GB
- **Интернет-соединение**: Требуется для загрузки зависимостей и AI сервисов

### Рекомендуемые требования
- **RAM**: 16 GB+
- **SSD**: Для быстрой работы
- **Современный браузер**: Chrome 90+, Firefox 88+, Safari 14+

## 🟢 Установка Node.js

### Windows

1. **Скачайте Node.js**
   - Перейдите на [nodejs.org](https://nodejs.org/)
   - Скачайте LTS версию (рекомендуется 18.x или выше)

2. **Установите Node.js**
   - Запустите скачанный `.msi` файл
   - Следуйте инструкциям установщика
   - Убедитесь, что отмечена опция "Add to PATH"

3. **Проверьте установку**
   ```powershell
   node --version
   npm --version
   ```

### macOS

1. **Используя Homebrew (рекомендуется)**
   ```bash
   # Установите Homebrew, если его нет
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Установите Node.js
   brew install node
   ```

2. **Или скачайте с официального сайта**
   - Перейдите на [nodejs.org](https://nodejs.org/)
   - Скачайте `.pkg` файл для macOS
   - Установите следуя инструкциям

### Linux (Ubuntu/Debian)

```bash
# Обновите пакеты
sudo apt update

# Установите Node.js и npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверьте установку
node --version
npm --version
```

## 📥 Клонирование проекта

1. **Установите Git** (если не установлен)
   - Windows: [git-scm.com](https://git-scm.com/download/win)
   - macOS: `brew install git`
   - Linux: `sudo apt install git`

2. **Клонируйте репозиторий**
   ```bash
   git clone https://github.com/your-username/albert3-muse-synth-studio.git
   cd albert3-muse-synth-studio
   ```

## 🔧 Настройка переменных окружения

1. **Создайте файл `.env`**
   ```bash
   # Windows (PowerShell)
   Copy-Item .env.example .env
   
   # macOS/Linux
   cp .env.example .env
   ```

2. **Откройте `.env` в текстовом редакторе**
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id
   
   # AI Services (опционально)
   VITE_SUNO_API_KEY=your_suno_api_key
   VITE_REPLICATE_API_TOKEN=your_replicate_token
   
   # Development
   VITE_APP_ENV=development
   VITE_APP_VERSION=1.2.0
   ```

## 🗄️ Настройка Supabase

### Создание проекта Supabase

1. **Зарегистрируйтесь на Supabase**
   - Перейдите на [supabase.com](https://supabase.com)
   - Создайте аккаунт или войдите

2. **Создайте новый проект**
   - Нажмите "New Project"
   - Выберите организацию
   - Введите название проекта: `albert3-muse-synth-studio`
   - Выберите регион (ближайший к вам)
   - Создайте надежный пароль для базы данных

3. **Получите данные проекта**
   - Перейдите в Settings → API
   - Скопируйте:
     - Project URL → `VITE_SUPABASE_URL`
     - Project API keys → anon public → `VITE_SUPABASE_PUBLISHABLE_KEY`
     - Project reference ID → `VITE_SUPABASE_PROJECT_ID`

### Настройка базы данных

1. **Установите Supabase CLI**
   ```bash
   npm install -g @supabase/cli
   ```

2. **Войдите в Supabase**
   ```bash
   supabase login
   ```

3. **Инициализируйте проект**
   ```bash
   supabase init
   ```

4. **Свяжите с удаленным проектом**
   ```bash
   supabase link --project-ref your-project-id
   ```

5. **Примените миграции** (если есть)
   ```bash
   supabase db push
   ```

### Настройка аутентификации

1. **В панели Supabase перейдите в Authentication → Settings**
2. **Настройте провайдеров**
   - Email: Включен по умолчанию
   - Google: Добавьте Client ID и Secret (опционально)
   - GitHub: Добавьте Client ID и Secret (опционально)

3. **Настройте URL перенаправления**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`

### Настройка Storage

1. **Создайте bucket для файлов**
   ```sql
   -- В SQL Editor Supabase
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('audio-files', 'audio-files', true);
   
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('user-uploads', 'user-uploads', false);
   ```

2. **Настройте политики RLS**
   ```sql
   -- Политики для audio-files bucket
   CREATE POLICY "Public Access" ON storage.objects
   FOR SELECT USING (bucket_id = 'audio-files');
   
   -- Политики для user-uploads bucket
   CREATE POLICY "Users can upload own files" ON storage.objects
   FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
   ```

## 🤖 Настройка AI сервисов

### Suno AI API

1. **Получите API ключ**
   - Зарегистрируйтесь на [suno.ai](https://suno.ai)
   - Перейдите в настройки API
   - Создайте новый API ключ
   - Добавьте в `.env`: `VITE_SUNO_API_KEY=your_key`

### Replicate API

1. **Получите токен**
   - Зарегистрируйтесь на [replicate.com](https://replicate.com)
   - Перейдите в Account → API tokens
   - Создайте новый токен
   - Добавьте в `.env`: `VITE_REPLICATE_API_TOKEN=your_token`

## 📦 Установка зависимостей

1. **Установите зависимости проекта**
   ```bash
   # Используя npm
   npm install
   
   # Или используя yarn
   yarn install
   
   # Или используя pnpm (быстрее)
   pnpm install
   ```

2. **Проверьте установку**
   ```bash
   npm list --depth=0
   ```

## 🚀 Запуск проекта

### Режим разработки

```bash
# Запуск dev сервера
npm run dev

# Или с определенным портом
npm run dev -- --port 3000
```

Приложение будет доступно по адресу: `http://localhost:5173`

### Сборка для продакшена

```bash
# Сборка проекта
npm run build

# Предварительный просмотр сборки
npm run preview
```

### Дополнительные команды

```bash
# Проверка кода
npm run lint

# Исправление ошибок линтера
npm run lint:fix

# Форматирование кода
npm run format

# Запуск тестов
npm run test

# Запуск тестов в watch режиме
npm run test:watch
```

## 🔧 Решение проблем

### Проблемы с Node.js

**Ошибка: "node: command not found"**
```bash
# Проверьте PATH
echo $PATH

# Переустановите Node.js
# Или используйте nvm для управления версиями
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### Проблемы с npm

**Ошибка: "EACCES: permission denied"**
```bash
# Настройте npm для глобальных пакетов
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Медленная установка пакетов**
```bash
# Используйте другой registry
npm config set registry https://registry.npmmirror.com/

# Или используйте pnpm
npm install -g pnpm
pnpm install
```

### Проблемы с Supabase

**Ошибка подключения к базе данных**
1. Проверьте правильность URL и ключей в `.env`
2. Убедитесь, что проект Supabase активен
3. Проверьте настройки сети и firewall

**Ошибки аутентификации**
1. Проверьте настройки Auth в панели Supabase
2. Убедитесь в правильности redirect URLs
3. Проверьте политики RLS

### Проблемы с портами

**Порт 5173 занят**
```bash
# Найдите процесс, использующий порт
# Windows
netstat -ano | findstr :5173

# macOS/Linux
lsof -i :5173

# Запустите на другом порту
npm run dev -- --port 3000
```

### Проблемы с CORS

**CORS ошибки при разработке**
1. Убедитесь, что Supabase настроен правильно
2. Проверьте настройки CORS в Supabase
3. Используйте правильные URL в конфигурации

### Проблемы с производительностью

**Медленная загрузка**
1. Проверьте размер bundle: `npm run build && npm run analyze`
2. Оптимизируйте изображения и аудио файлы
3. Используйте lazy loading для компонентов

## 📚 Дополнительные ресурсы

- [Документация React](https://react.dev/)
- [Документация Vite](https://vitejs.dev/)
- [Документация Supabase](https://supabase.com/docs)
- [Документация Tailwind CSS](https://tailwindcss.com/docs)
- [Документация TypeScript](https://www.typescriptlang.org/docs/)

## 🆘 Получение помощи

Если у вас возникли проблемы:

1. **Проверьте Issues** в репозитории GitHub
2. **Создайте новый Issue** с подробным описанием проблемы
3. **Включите информацию о системе**:
   - Операционная система и версия
   - Версия Node.js и npm
   - Сообщения об ошибках
   - Шаги для воспроизведения

## ✅ Проверка установки

После завершения установки выполните эти проверки:

1. **Проверьте версии**
   ```bash
   node --version    # Должно быть 18+
   npm --version     # Должно быть 9+
   ```

2. **Проверьте переменные окружения**
   ```bash
   # Убедитесь, что .env содержит все необходимые переменные
   cat .env
   ```

3. **Проверьте подключение к Supabase**
   - Откройте приложение в браузере
   - Попробуйте зарегистрироваться/войти
   - Проверьте консоль браузера на ошибки

4. **Проверьте функциональность**
   - Загрузите аудио файл
   - Попробуйте воспроизвести трек
   - Проверьте работу AI функций (если настроены)

Поздравляем! 🎉 Albert3 Muse Synth Studio готов к использованию!