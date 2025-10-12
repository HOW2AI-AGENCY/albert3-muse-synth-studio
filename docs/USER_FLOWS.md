# 🧑‍🚀 Пользовательские сценарии

В этом документе описаны основные пользовательские сценарии (User Flows), которые реализует приложение.

## 1. Регистрация и аутентификация

- **Описание:** Пользователь может создать аккаунт, войти в систему и выйти из нее.
- **Технологии:** Supabase Auth.
- **Процесс:**
    1. Пользователь заходит на страницу логина/регистрации.
    2. Вводит свои данные (email/пароль или использует OAuth провайдера).
    3. Supabase Auth обрабатывает запрос, создает сессию и возвращает JWT токен.
    4. Фронтенд сохраняет токен и использует его для всех последующих запросов к API.

## 2. Генерация музыкального трека

- **Описание:** Основной сценарий, в котором пользователь создает музыку по текстовому описанию.
- **Технологии:** React, Supabase Edge Functions, Suno API, Supabase DB, Supabase Storage, Supabase Realtime.
- **Диаграмма последовательности:**

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant FE as Frontend (React App)
    participant Supabase as Supabase Client
    participant EdgeFunc as Edge Function (generate-suno)
    participant Suno as Suno API
    participant DB as Supabase DB
    participant Storage as Supabase Storage

    User->>FE: Вводит промпт и нажимает "Сгенерировать"
    FE->>Supabase: Вызывает functions.invoke('generate-suno', { ... })
    Supabase->>EdgeFunc: Передает запрос с JWT пользователя
    
    EdgeFunc->>DB: Создает запись в таблице `tracks` со статусом 'pending'
    DB-->>EdgeFunc: Возвращает ID нового трека
    
    EdgeFunc->>Suno: Отправляет запрос на генерацию (POST /api/generate)
    Suno-->>EdgeFunc: Возвращает ID задачи (task_id)
    
    EdgeFunc->>DB: Обновляет трек, добавляя `suno_task_id` и статус 'processing'
    EdgeFunc-->>Supabase: Возвращает { success: true, trackId: ... }
    Supabase-->>FE: Уведомляет UI о начале генерации
    
    alt Поллинг (если Callback URL не настроен)
        loop Каждые 5-10 секунд
            EdgeFunc->>Suno: Запрашивает статус задачи (GET /api/task/<task_id>)
            Suno-->>EdgeFunc: Возвращает статус ('processing' или 'completed')
        end
    end

    Suno->>EdgeFunc: (Если настроено) Отправляет POST на Callback URL, когда готово

    EdgeFunc->>Suno: Получает финальный статус 'completed' и URL-ы
    EdgeFunc->>Storage: Скачивает аудио и обложку с URL-ов Suno
    Storage-->>EdgeFunc: Загружает файлы в Supabase Storage и возвращает публичные URL
    
    EdgeFunc->>DB: Обновляет запись трека: статус 'completed', URL-ы аудио/обложки, метаданные
    
    FE->>DB: (Через подписку Supabase Realtime) Получает обновление статуса трека
    FE->>User: Отображает готовый трек в списке
```

## 3. Прослушивание и управление треками

- **Описание:** Пользователь может просматривать список своих треков, прослушивать их, просматривать разные версии и удалять.
- **Технологии:** React, Supabase DB, Supabase Storage, Audio Player component.
- **Процесс:**
    1. Пользователь открывает страницу со списком своих треков.
    2. Фронтенд запрашивает у Supabase DB список треков для текущего пользователя.
    3. Данные отображаются в виде списка.
    4. При нажатии на кнопку "Play", URL аудио-файла из Supabase Storage передается в компонент аудиоплеера.
    5. При удалении трека, фронтенд отправляет запрос в Supabase (через Edge Function или напрямую), который удаляет запись из БД и связанные файлы из Storage.