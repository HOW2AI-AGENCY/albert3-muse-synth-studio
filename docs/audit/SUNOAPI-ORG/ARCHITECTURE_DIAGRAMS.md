# Архитектурные диаграммы

## Компоненты системы
```mermaid
graph TD
  UI[React + Vite + TS] --> Hooks[Hooks/Contexts]
  Hooks --> Query[TanStack React Query]
  Hooks --> SupaClient[@supabase/supabase-js]
  SupaClient --> Edge[Supabase Edge Functions]
  Edge --> DB[(PostgreSQL)]
  Edge --> Storage[(Supabase Storage)]
  UI --> Sentry[Sentry]
```

## Взаимодействия сервисов
```mermaid
sequenceDiagram
  participant UI
  participant Edge
  participant Suno
  participant Supabase
  UI->>Edge: Запрос генерации/обновления
  Edge->>Suno: Вызов API (callbacks/polling)
  Suno-->>Edge: Callback (text/first/complete)
  Edge->>Supabase: Запись статуса/Storage upload
  UI->>Supabase: Чтение данных/стриминг
```

## Потоки (flow) ключевых процессов
```mermaid
flowchart LR
  A[Генерация лирики] --> B[Получение taskId]
  B --> C{Callback/Polling}
  C -- Успех --> D[Сохранение результата]
  C -- Ошибка --> E[Retry/Backoff]
```