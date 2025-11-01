# 🎵 Albert3 Muse Synth Studio

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)

![CI Status](https://img.shields.io/github/actions/workflow/status/HOW2AI-AGENCY/albert3-muse-synth-studio/ci.yml?branch=main&style=for-the-badge&label=CI)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)
![Version](https://img.shields.io/badge/version-3.1.0--beta.1-blue?style=for-the-badge)
![Sprint](https://img.shields.io/badge/Sprint-33-green?style=for-the-badge)

**🎼 Профессиональная студия для создания музыки с помощью ИИ**

[🚀 Live Demo](https://albert3-muse-synth-studio.lovable.app) • [📚 Документация](docs/README.md) • [📊 Текущий спринт](project-management/current-sprint/README.md)

</div>

---

## 🎯 Что такое Albert3?

Albert3 Muse Synth Studio — современное веб-приложение для генерации музыки с помощью искусственного интеллекта. Создано с использованием передовых технологий для музыкантов, продюсеров и творческих людей, желающих использовать ИИ в своем творческом процессе.

**Ключевые возможности:**
- 🎼 Генерация профессиональной музыки через **Suno AI** и **Mureka AI**
- 📝 Создание текстов песен с помощью ИИ, разделение треков на стемы (вокал/инструменты)
- 🎧 Управление музыкальной библиотекой с продвинутым аудиоплеером и версионированием

## ✨ Основные возможности

- 🎼 **ИИ-генерация музыки** — провайдеры Suno AI и Mureka AI с умными промптами
- 📝 **Генерация текстов** — создание текстов песен с помощью ИИ, множественные варианты
- 🎵 **Разделение на стемы** — разделение треков на вокал, инструменталку и 12 инструментальных стемов
- 🎧 **Продвинутый плеер** — глобальный плеер с очередью, мини-плеер и полноэкранный режим
- 💾 **Облачное хранилище** — система авто-архивации с 15-дневным кэшированием CDN
- 👥 **Управление пользователями** — аутентификация, система кредитов, аналитика
- 📊 **Аналитика** — отслеживание прослушиваний, загрузок, просмотров и статистики пользователей

## 🚀 Быстрый старт

```bash
# Клонируйте репозиторий
git clone https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio

# Установите зависимости
npm install

# Запустите сервер разработки
npm run dev
```

**Требования**: Node.js 18+, npm 9+

Детальные инструкции по установке см. в [Руководстве по началу работы](docs/getting-started/installation.md).

## 🏗️ Технологический стек

**Frontend**
- React 18.3.1 + TypeScript 5.8.3
- Vite 5.4.19 (система сборки)
- TailwindCSS 3.4.17 (стилизация)
- Zustand 5.0.8 (управление состоянием)
- TanStack Query 5.90.2 (загрузка данных)

**Backend (Lovable Cloud)**
- Supabase 2.58.0 (BaaS платформа)
- PostgreSQL 15.8 (база данных)
- Edge Functions (Deno 1.47)
- Supabase Storage (CDN)

**ИИ-сервисы**
- Suno AI v5 (генерация музыки)
- Mureka AI O1 (генерация музыки)
- Lovable AI (улучшение промптов)
- Replicate API (разделение на стемы)

**Мониторинг**
- Sentry 10.22.0 (отслеживание ошибок)
- Web Vitals 3.5.2 (производительность)

## 📊 Статус проекта

| Метрика | Значение | Статус |
|--------|----------|--------|
| **Версия** | v3.1.0-beta.1 | 🟢 Активная разработка |
| **Спринт** | Спринт 33 (Provider Refactoring) | 🟢 В процессе |
| **Готовность к продакшену** | ✅ 97% | 🟢 Готово |
| **Оценка безопасности** | 98% | 🟢 Отлично |
| **Производительность (Lighthouse)** | 95/100 | 🟢 Отлично |
| **Покрытие тестами** | 60% → 80% (цель) | 🟡 Улучшается |

**Последние обновления (Спринт 33):**
- ✅ Рефакторинг Provider System (ProviderFactory, unified validation)
- ✅ Синхронизация Frontend/Backend validation schemas
- ✅ Исправление критических багов Mureka API (recognizeSong, describeSong)
- ✅ Comprehensive documentation (PROVIDER_MIGRATION_GUIDE, BACKEND_FRONTEND_SYNC)
- ✅ Полная документация API

## 📅 Управление спринтами

### 🟢 В процессе

#### Спринт 32: Инфраструктура тестирования
**Даты**: 1-28 ноября 2025 (4 недели)  
**Цель**: Достичь 60% покрытия тестами  
**Прогресс**: 0/21 SP

**Задачи**:
- Unit-тесты для хуков (8 SP)
- Интеграционные тесты для Edge Functions (5 SP)
- E2E тесты с Playwright (5 SP)
- Интеграция CI/CD (3 SP)

📊 [Детали спринта](project-management/current-sprint/README.md)

---

### ✅ Завершенные спринты

#### Спринт 31: Закрытие технического долга ✅
**Даты**: 28-31 октября 2025 (4 дня)  
**Статус**: ЗАВЕРШЕН (80%)

**Достижения**:
- 🔒 Безопасность: 62% → 96% (+55%)
- ⚡ Производительность: Бандл -62%, Lighthouse +20
- 🎵 Mureka: 70% → 95% успешность
- 📚 Документация: 100% покрытие

📄 [Отчет о закрытии](project-management/sprints/sprint-31/closure.md) • [Достижения](project-management/sprints/sprint-31/achievements.md)

---

#### Спринт 27: Улучшение UI/UX ✅
**Даты**: 13-20 октября 2025  
**Статус**: ЗАВЕРШЕН

**Достижения**:
- Диаграммы документации
- Система персонализации (4 цвета + 3 режима плотности)
- Оптимизация DetailPanel
- Компоненты LazyImage и VirtualList

---

### 🔮 Запланированные спринты

#### Спринт 33: Продвинутая аналитика (Планируется)
**Планируемые даты**: Декабрь 2025  
**Цель**: Расширенная аналитика и отчетность

**Задачи** (предварительные):
- Dashboard для аналитики пользователей
- Экспорт данных и отчеты
- Графики трендов и статистики
- Интеграция с внешними аналитическими сервисами

---

#### Спринт 34: Социальные функции (Планируется)
**Планируемые даты**: Январь 2026  
**Цель**: Социальное взаимодействие между пользователями

**Задачи** (предварительные):
- Публичные профили пользователей
- Система подписок и подписчиков
- Комментарии и рейтинги треков
- Лента активности

---

📈 [Полная история спринтов](project-management/sprints/archive.md) • [Roadmap Q4 2025](project-management/roadmap/q4-2025.md)

## 📚 Документация

### Для пользователей
- [Начало работы](docs/getting-started/installation.md) - Установка и настройка
- [Руководство пользователя](docs/user-guide/README.md) - Как использовать платформу
- [Решение проблем](docs/TROUBLESHOOTING.md) - Частые проблемы и решения

### Для разработчиков
- [Полная документация](docs/README.md) - Полный индекс документации
- [Архитектура](docs/architecture/overview.md) - Архитектура системы
- [Справочник API](docs/api/README.md) - Документация API
- [Руководство по разработке](docs/guides/development.md) - Процесс разработки
- [Участие в проекте](CONTRIBUTING.md) - Как внести вклад

### Управление проектом
- [Текущий спринт](project-management/current-sprint/README.md) - Статус спринта 32
- [Дорожная карта](project-management/roadmap/q4-2025.md) - План развития
- [История спринтов](project-management/sprints/archive.md) - Прошлые спринты

## 🤝 Участие в проекте

Мы приветствуем вклад в проект! См. [Руководство по участию](CONTRIBUTING.md) для деталей.

**Быстрый чеклист для участников:**
1. Сделайте форк репозитория
2. Создайте ветку с фичей: `git checkout -b feature/my-feature`
3. Закоммитьте изменения: `git commit -m "feat: add feature"`
4. Отправьте в ветку: `git push origin feature/my-feature`
5. Откройте Pull Request

## 📄 Лицензия

Этот проект распространяется под лицензией MIT — см. файл [LICENSE](LICENSE) для деталей.

## 👥 Команда

Разработано [HOW2AI Agency](https://github.com/HOW2AI-AGENCY)

## 📞 Поддержка

- **Документация**: [docs/README.md](docs/README.md)
- **Проблемы**: [GitHub Issues](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/issues)
- **Обсуждения**: [GitHub Discussions](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/discussions)

---

**Последнее обновление**: 31 октября 2025 | **Версия**: v3.0.0-alpha.5 | **Спринт**: 32
