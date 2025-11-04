<div align="center">
  <img src="docs/assets/logo.png" alt="Albert3 Muse Synth Studio Logo" width="150">
  <h1>Albert3 Muse Synth Studio</h1>
  <p><strong>Профессиональная платформа для AI-генерации музыки</strong></p>
  <p>Интеграция с Suno & Replicate • Версионирование треков • Аналитика в реальном времени</p>

  <div>
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=for-the-badge&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/React-18.3-61dafb.svg?style=for-the-badge&logo=react" alt="React">
    <img src="https://img.shields.io/badge/Supabase-2.x-3ecf8e.svg?style=for-the-badge&logo=supabase" alt="Supabase">
    <img src="https://img.shields.io/badge/Vite-5.4-646cff.svg?style=for-the-badge&logo=vite" alt="Vite">
  </div>
  <div>
    <img src="https://img.shields.io/github/workflow/status/albert-app/albert3-muse-synth-studio/CI?style=for-the-badge&logo=github&label=CI" alt="CI Status">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome">
  </div>

</div>

---

## 🎯 О проекте

**Albert3 Muse Synth Studio** — это передовая SPA-платформа для профессиональной работы с AI-генерацией музыки. Приложение объединяет возможности **Suno AI** (генерация) и **Replicate.com** (анализ), предоставляя музыкантам, продюсерам и контент-криейторам мощный инструментарий для создания, редактирования и управления музыкальными композициями.

## 📚 Навигация по репозиторию

| Раздел | Описание | Быстрые ссылки |
| :--- | :--- | :--- |
| 🚀 **Быстрый старт** | Все, что нужно для запуска проекта за 5 минут. | [Установка](#-установка) • [Запуск](#-быстрый-старт) |
| 🏗️ **Архитектура** | Глубокое погружение в архитектуру системы. | [Описание](./docs/ARCHITECTURE.md) • [Схема](#-архитектура-системы) |
| 🔬 **Аудит** | Результаты последнего технического аудита. | [Отчёты](./docs/audit/) • [План работ](./docs/audit/05_Refactor_Plan.md) |
| 🎛️ **Компоненты** | Обзор UI-кита и ключевых компонентов. | `src/components/ui` |
| ☁️ **Backend** | Обзор Edge-функций Supabase. | `supabase/functions` |
| 🤝 **Контрибьютинг**| Как помочь проекту. | [Гайд](./CONTRIBUTING.md) • [Задачи](./project-management) |

---

## ✨ Ключевые особенности

-   ✅ **Dual-Provider**: Интеграция с Suno AI (генерация) и Replicate.com (анализ).
-   ✅ **Система версий**: Создание и управление несколькими версиями одного трека.
-   ✅ **Обработка аудио**: Разделение на стемы, анализ BPM, тональности и жанра.
-   ✅ **AI-генерация текстов**: Автоматическое создание текстов песен с помощью AI.
-   ✅ **Проектная организация**: Группировка треков в альбомы и проекты для удобного управления.
-   ✅ **Аналитика в реальном времени**: Отслеживание статистики прослушиваний.

---

## 🏗️ Архитектура системы

Платформа использует архитектуру **Frontend -> Backend-as-a-Service (BaaS)**, где фронтенд-приложение на React взаимодействует с Supabase, который предоставляет базу данных, аутентификацию, хранилище и бессерверные Edge-функции.

<details>
<summary>Диаграмма архитектуры (нажмите для просмотра)</summary>

```mermaid
graph TB
    subgraph "Frontend Layer (React + Vite)"
        A[UI Components (shadcn/ui)]
        B[State Management (React Query + Zustand)]
        C[Routing (React Router)]
    end

    subgraph "Backend Layer (Supabase)"
        F[Edge Functions (Deno)]
        G[Database (PostgreSQL + RLS)]
        H[Authentication (JWT)]
        I[Storage]
    end

    subgraph "External AI Providers"
        K[Suno AI API]
        L[Replicate.com API]
    end

    A & C --> B; B --> F;
    F --> K; F --> L; F --> G; F --> I;
    G --> H;

    style A fill:#61DAFB,stroke:#333,stroke-width:2px
    style F fill:#3ECF8E,stroke:#333,stroke-width:2px
    style K fill:#FF6F61,stroke:#333,stroke-width:2px
    style L fill:#9B59B6,stroke:#333,stroke-width:2px
```

</details>

---

## 🚀 Установка

### Предварительные требования

-   **Node.js**: `v18.0.0` или выше
-   **npm**: `v9.0.0` или выше
-   **Git**

### Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone https://github.com/albert-app/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
# Для работы с Supabase создайте файл .env и добавьте ключи проекта
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# REPLICATE_API_KEY=... (для бэкенда)

# 4. Запустить dev-сервер
npm run dev

# 5. Открыть в браузере: http://localhost:5173
```

---

## 🎮 Примеры использования

<details>
<summary>Пример: Генерация трека (нажмите для просмотра)</summary>

```typescript
import { supabase } from '@/integrations/supabase/client';

const generateTrack = async () => {
  const { data, error } = await supabase.functions.invoke('generate-suno', {
    body: {
      prompt: "Upbeat electronic dance music with energetic vibes",
      tags: "edm, energetic, dance",
    }
  });

  if (error) console.error('Ошибка генерации:', error);
  else console.log('Генерация запущена, ID задачи:', data.taskId);
};
```

</details>

<details>
<summary>Пример: Получение версий трека (нажмите для просмотра)</summary>

```typescript
import { useTrackVersions } from '@/hooks/useTrackVersions';

const TrackVersionsComponent = ({ trackId }: { trackId: string }) => {
  const { data: versions, isLoading } = useTrackVersions(trackId);

  if (isLoading) return <p>Загрузка версий...</p>;

  return (
    <ul>
      {versions?.map((version) => (
        <li key={version.id}>
          Версия {version.variant_index ?? version.version_number}
          <audio controls src={version.audio_url} />
        </li>
      ))}
    </ul>
  );
};
```
</details>

---

## 🧪 Тестирование

```bash
# Запустить все unit-тесты
npm test

# Запустить E2E-тесты
npm run test:e2e

# Проверить покрытие тестами
npm run test:coverage
```

---

## 🤝 Вклад в проект

Мы приветствуем ваш вклад! Пожалуйста, ознакомьтесь с нашим [**Руководством для контрибьюторов (CONTRIBUTING.md)**](./CONTRIBUTING.md) перед началом работы.

---

## 📄 Лицензия

Этот проект лицензирован под [MIT License](./LICENSE).
