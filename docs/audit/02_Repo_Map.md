# Карта репозитория (Repo Map)

Это визуальное представление структуры проекта, сгенерированное с помощью Mermaid.js.

## Общая структура

```mermaid
graph TD
    A[Albert3 Muse Synth Studio] --> B[src/];
    A --> C[supabase/];
    A --> D[docs/];
    A --> E[public/];
    A --> F[tests/];
    A --> G[package.json];
    A --> H[vite.config.ts];

    subgraph "Frontend (src)"
        B --> B1[pages/];
        B --> B2[components/];
        B --> B3[hooks/];
        B --> B4[services/];
        B --> B5[stores/];
        B --> B6[integrations/];
    end

    subgraph "Backend (supabase)"
        C --> C1[functions/];
        C --> C2[migrations/];
        C --> C3[config.toml];
    end

    subgraph "Тестирование"
        F --> F1[e2e/];
        F --> F2[unit/];
    end

    B2 --> B2_1[ui/];
    B2 --> B2_2[layout/];
    B2 --> B2_3[player/];

    C1 --> C1_1[generate-suno/];
    C1 --> C1_2[suno-callback/];
    C1 --> C1_3[analyze-audio/];
    C1 --> C1_4[_shared/];
```

## Потоки данных (Data Flows)

### 1. Генерация трека (Suno)

```mermaid
sequenceDiagram
    participant User as Пользователь (UI)
    participant Frontend as Фронтенд (React)
    participant EdgeFunc as Edge-функция (generate-suno)
    participant SunoAPI as Suno API
    participant Callback as Edge-функция (suno-callback)
    participant DB as Supabase DB

    User->>Frontend: Заполняет форму, нажимает "Сгенерировать"
    Frontend->>EdgeFunc: Вызывает /generate-suno с JWT и параметрами
    EdgeFunc->>DB: Проверяет баланс пользователя (future)
    EdgeFunc->>SunoAPI: Отправляет запрос на генерацию
    SunoAPI-->>EdgeFunc: Возвращает taskId
    EdgeFunc-->>Frontend: Возвращает taskId

    Note over SunoAPI, DB: ...проходит время...

    SunoAPI->>Callback: Вызывает /suno-callback с готовыми треками
    Callback->>DB: Скачивает ассеты, сохраняет трек и его версии в `tracks` и `track_versions`
```

### 2. Анализ аудио (Mureka)

```mermaid
sequenceDiagram
    participant User as Пользователь (UI)
    participant Frontend as Фронтенд (React)
    participant EdgeFunc as Edge-функция (analyze-audio)
    participant MurekaAPI as Mureka API

    User->>Frontend: Загружает аудиофайл
    Frontend->>EdgeFunc: Вызывает /analyze-audio с URL аудио

    Note right of EdgeFunc: 🚨 Уязвимость: нет проверки JWT!

    EdgeFunc->>MurekaAPI: Скачивает аудио, загружает на Mureka
    MurekaAPI-->>EdgeFunc: Возвращает результат анализа (BPM, жанр, и т.д.)
    EdgeFunc-->>Frontend: Возвращает результат анализа
```
