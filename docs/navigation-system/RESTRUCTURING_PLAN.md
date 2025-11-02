# 🗺️ План реструктуризации системы навигации
*Версия: 2.0.0*  
*Дата: 2025-11-02*

## 📋 Текущая структура (AS-IS)

### Существующие экраны:
```
/workspace/
├── dashboard         # Главная страница
├── generate          # Генератор музыки
├── library           # Треки
├── lyrics-library    # Лирика
├── audio-library     # Аудио
├── personas          # Персоны
├── favorites         # Избранное
├── settings          # Настройки
├── analytics         # Аналитика
├── metrics           # Метрики (не используется активно)
├── admin             # Админ-панель
└── monitoring        # Мониторинг
```

### Проблемы текущей структуры:
1. ❌ Фрагментация: библиотеки разбросаны (library, lyrics-library, audio-library)
2. ❌ Дублирование: analytics + monitoring + metrics (частично пересекаются)
3. ❌ Отсутствие группировки: нет логических блоков
4. ❌ Плоская структура: все на одном уровне
5. ❌ Отсутствие workspace-концепции: нет проектов

---

## 🎯 Новая структура (TO-BE)

### 1️⃣ ГЛАВНАЯ (Dashboard)
**Путь:** `/workspace/dashboard`  
**Назначение:** Обзор, быстрый доступ, статистика

**Разделы:**
- 📊 Статистика (треки, просмотры, лайки)
- ⚡ Быстрые действия (создать трек, открыть проект)
- 🎵 Последние треки
- 📈 Тренды

---

### 2️⃣ СОЗДАТЬ (Generate)
**Путь:** `/workspace/generate`  
**Назначение:** AI-генерация музыки

**Остается без изменений** (уже хорошо структурирован)

---

### 3️⃣ ПРОЕКТЫ (Projects) 🆕
**Путь:** `/workspace/projects`  
**Назначение:** Управление музыкальными проектами

#### Структура:
```
/workspace/projects/
├── [Root]            # Список проектов
├── /create           # Создание проекта (с нуля / с AI)
└── /:projectId       # Детальный view проекта
    ├── [Tab] Треки
    ├── [Tab] Лирика
    ├── [Tab] Промпты
    └── [Tab] Персоны
```

#### Функционал:

**Список проектов:**
- Создать новый проект (с нуля / с помощью AI)
- Grid/List view
- Поиск и фильтры
- Сортировка (дата, название, активность)

**Детальный view проекта:**

**Tab: Треки**
- Все треки проекта
- Версии треков
- Стемы
- Drag & drop для организации

**Tab: Лирика**
- Сохраненные тексты для проекта
- История генераций
- Редактор текстов

**Tab: Промпты** 🆕
- Сохраненные промпты для проекта
- Категории (музыка, лирика, стиль)
- Шаблоны промптов
- История использования

**Tab: Персоны**
- Персоны Suno, связанные с проектом
- Быстрый выбор для генерации
- Статистика использования

**База данных:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_with_ai BOOLEAN DEFAULT false,
  ai_generation_params JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_tracks (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, track_id)
);

CREATE TABLE project_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- music, lyrics, style
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связь лирики с проектами
ALTER TABLE saved_lyrics ADD COLUMN project_id UUID REFERENCES projects(id);

-- Связь персон с проектами
ALTER TABLE suno_personas ADD COLUMN project_id UUID REFERENCES projects(id);
```

---

### 4️⃣ ОБЛАКО (Cloud) 🆕
**Путь:** `/workspace/cloud`  
**Назначение:** Файловое хранилище

#### Структура:
```
/workspace/cloud/
└── [Root с табами]
    ├── [Tab] Аудио       # Загруженные/записанные аудиофайлы
    ├── [Tab] Семплы      # Семплы и лупы
    ├── [Tab] Эффекты     # Звуковые эффекты
    └── [Tab] Биты        # Битовые дорожки
```

#### Функционал:

**Общий для всех табов:**
- 📁 Папки (создание, переименование, удаление)
- 🔍 Поиск по файлам
- 🏷️ Теги и метаданные
- ⭐ Избранное
- 📊 Сортировка (дата, название, размер, тип)
- 👁️ Preview панель (audio player + метаданные)

**Tab: Аудио**
- Загруженные пользователем
- Записанные (будущая функция)
- Расширенные треки
- Фильтр по source_type

**Tab: Семплы**
- Короткие аудио-семплы (<30s)
- Категории (drums, bass, synth, fx)
- BPM detection
- Key detection

**Tab: Эффекты**
- Звуковые эффекты
- Категории (riser, impact, transition)
- Длительность

**Tab: Биты**
- Битовые дорожки
- BPM фильтр
- Жанр
- Настроение

**База данных:**
```sql
CREATE TYPE cloud_file_category AS ENUM ('audio', 'sample', 'effect', 'beat');

ALTER TABLE audio_library ADD COLUMN category cloud_file_category DEFAULT 'audio';
ALTER TABLE audio_library ADD COLUMN bpm INTEGER;
ALTER TABLE audio_library ADD COLUMN key TEXT;
ALTER TABLE audio_library ADD COLUMN parent_folder_id UUID REFERENCES cloud_folders(id);

CREATE TABLE cloud_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category cloud_file_category NOT NULL,
  parent_id UUID REFERENCES cloud_folders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5️⃣ ИЗБРАННОЕ (Favorites)
**Путь:** `/workspace/favorites`  
**Остается без изменений** - уже хороший UX

---

### 6️⃣ НАСТРОЙКИ (Settings)
**Путь:** `/workspace/settings`  
**Назначение:** Все настройки в одном месте

#### Структура (табы):
```
/workspace/settings/
└── [Root с табами]
    ├── [Tab] Внешний вид      # Personalization (theme, density)
    ├── [Tab] Профиль          # User profile
    ├── [Tab] Уведомления      # Notifications
    ├── [Tab] Аналитика        # Analytics + Metrics
    ├── [Tab] Безопасность     # Security settings
    └── [Tab] Дополнительно    # Advanced (migration, export, etc.)
```

**Объединяет:**
- ✅ Settings (текущий)
- ✅ Analytics (перенести в таб)
- ✅ Metrics (перенести в таб, объединить с Analytics)

**Преимущества:**
- Все настройки в одном месте
- Логическая группировка
- Меньше пунктов в навигации

---

### 7️⃣ АДМИН-ПАНЕЛЬ (Admin)
**Путь:** `/workspace/admin`  
**Доступ:** Только для пользователей с ролью `admin`

#### Структура (табы):
```
/workspace/admin/
└── [Root с табами]
    ├── [Tab] Пользователи     # Users table, roles
    ├── [Tab] Треки            # All tracks moderation
    ├── [Tab] Генерации        # Generation logs
    ├── [Tab] Мониторинг       # System health (перенос из Monitoring)
    ├── [Tab] Настройки        # App settings (credit mode, etc.)
    └── [Tab] Логи             # System logs
```

**Объединяет:**
- ✅ Admin (текущий)
- ✅ Monitoring (перенести в таб)

**Новые функции:**
- 👥 Просмотр таблицы пользователей
- 📊 Логи генераций (все пользователи)
- 🎵 Все треки (модерация)
- 🔍 Поиск по пользователям/трекам
- 📈 Глобальная статистика

**База данных:**
```sql
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  track_id UUID REFERENCES tracks(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  params JSONB,
  error_message TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🗂️ Итоговая навигация

### Desktop Sidebar + Mobile Bottom Tabs:

**Primary (всегда видимые):**
1. 🏠 Главная (Dashboard)
2. ✨ Создать (Generate)
3. 📁 Проекты (Projects) 🆕
4. ☁️ Облако (Cloud) 🆕
5. ❤️ Избранное (Favorites)

**Secondary (доп. меню):**
6. ⚙️ Настройки (Settings с табами)
7. 🛡️ Админ (Admin - только для админов)

### Мобильная навигация (Bottom Tabs):
- Главная
- Создать
- Проекты
- Облако
- Меню (Drawer с остальными)

---

## 📊 Сравнение: До → После

| Метрика | Было | Стало | Изменение |
|---------|------|-------|-----------|
| Кол-во пунктов навигации | 12 | 7 | -42% |
| Уровней вложенности | 1 | 2 | +100% |
| Логических блоков | 0 | 4 | ∞ |
| Дублирующихся функций | 3 | 0 | -100% |
| Проектов (workspace) | ❌ | ✅ | +∞ |

---

## 🔄 Этапы миграции

### Phase 1: Подготовка (2-3 дня)
- [x] Создать план реструктуризации (этот документ)
- [ ] Создать новые схемы БД (projects, cloud_folders, generation_logs)
- [ ] Написать миграции
- [ ] Создать валидацию схем

### Phase 2: Новые экраны (5-7 дней)
- [ ] Создать `/workspace/projects` (список + детали)
- [ ] Создать `/workspace/cloud` с табами
- [ ] Рефакторить `/workspace/settings` (добавить табы Analytics/Metrics)
- [ ] Рефакторить `/workspace/admin` (добавить табы Monitoring/Users/Logs)

### Phase 3: Интеграция (3-4 дня)
- [ ] Связать треки с проектами
- [ ] Связать лирику с проектами
- [ ] Связать персоны с проектами
- [ ] Создать промпты для проектов
- [ ] Интегрировать Cloud с генератором (выбор референсов из облака)

### Phase 4: Навигация (2-3 дня)
- [ ] Обновить `workspace-navigation.ts`
- [ ] Обновить `router.tsx`
- [ ] Обновить `MinimalSidebar`
- [ ] Обновить `BottomTabBar`
- [ ] Обновить `MobileNavigation`

### Phase 5: Миграция данных (1-2 дня)
- [ ] Создать дефолтный проект для существующих треков
- [ ] Категоризировать аудио в облаке
- [ ] Перенести аналитику в настройки

### Phase 6: Тестирование (2-3 дня)
- [ ] E2E тесты новых флоу
- [ ] Unit тесты новых компонентов
- [ ] Тестирование навигации
- [ ] Performance тестирование

### Phase 7: Документация (1 день)
- [ ] Обновить README
- [ ] Обновить USER_GUIDE
- [ ] Обновить API документацию

**Total: 16-23 дня**

---

## 🎯 Ключевые улучшения

### 1. Workspace-концепция (Проекты)
- ✅ Логическая группировка треков, лирики, промптов
- ✅ Контекст для работы
- ✅ Удобная организация
- ✅ AI-ассистирование при создании проекта

### 2. Единое файловое хранилище (Облако)
- ✅ Все аудио в одном месте
- ✅ Папки для организации
- ✅ Категории (семплы, биты, эффекты)
- ✅ Метаданные (BPM, key, tags)

### 3. Консолидированные настройки
- ✅ Все в одном месте
- ✅ Меньше кликов
- ✅ Логическая группировка

### 4. Мощная админ-панель
- ✅ Полный контроль
- ✅ Все логи
- ✅ Модерация контента
- ✅ Управление пользователями

---

## 🚀 Приоритеты реализации

### Критичные (P0) - Сделать в первую очередь:
1. **Проекты** - core концепция
2. **Облако** - уже частично есть (audio-library)
3. **Настройки** - объединение существующих

### Важные (P1) - Сделать после P0:
4. **Админ-панель** - расширение существующей
5. **Навигация** - обновление UI

### Желательные (P2) - Постепенно:
6. Промпт-менеджер в проектах
7. BPM/Key detection в облаке
8. AI-генерация проектов

---

*Документ готов к утверждению*
