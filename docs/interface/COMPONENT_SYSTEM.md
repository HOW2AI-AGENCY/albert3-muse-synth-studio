# 🧩 Реестр интерфейсных компонентов Albert3 Muse Synth Studio

**Обновлено:** 13 октября 2025 · **Ответственный:** Frontend Guild

Документ описывает ключевые интерфейсные компоненты, их расположение в репозитории и правила использования. Используйте его при
проектировании новых экранов, ревью Pull Request и планировании задач по UI.

---

## 📁 Структура каталога `src/components`

```
src/components/
├── ui/                # Библиотека shadcn + расширения проекта
├── player/            # Компоненты аудиоплеера
├── tracks/            # Управление треками и стемами
├── workspace/         # Каркас рабочего пространства и навигация
├── navigation/        # Мобильная навигация и табы
├── layout/            # Макеты и контейнеры
├── mobile/            # Мобильные паттерны и жесты
├── animations/        # Анимации и переходы
└── shared/...         # Переиспользуемые вспомогательные элементы
```

- **Реестр компонентов:** `components.json` содержит описание стилевых пресетов и связи с AI-стилями.
- **Тесты:** UI покрывается Vitest + Testing Library (`src/components/__tests__`) и Playwright (E2E сценарии — Sprint 24 TASK TEST-001).

---

## 🧱 Базовые примитивы (`src/components/ui`)

| Категория | Компоненты | Особенности |
|-----------|------------|-------------|
| Ввод | `input.tsx`, `textarea.tsx`, `select.tsx`, `radio-group.tsx`, `checkbox.tsx`, `switch.tsx`, `input-otp.tsx` | Tailwind-утилиты, поддержка состояний `disabled`, `invalid`, интеграция с React Hook Form. |
| Действия | `button.tsx`, `toggle.tsx`, `toggle-group.tsx`, `command.tsx` | Согласованы с дизайн-системой; `button` поддерживает варианты (`default`, `secondary`, `ghost`, `destructive`) и иконки. |
| Навигация | `tabs.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `breadcrumb.tsx`, `sidebar.tsx` | Используются для десктопных экранов и комбинируются с `ResponsiveLayout`. |
| Отображение данных | `card.tsx`, `table.tsx`, `chart.tsx`, `skeleton.tsx`, `LoadingSkeleton.tsx` | `LoadingSkeleton` применяется в списках треков и плеере для плавной загрузки. |
| Обратная связь | `dialog.tsx`, `drawer.tsx`, `alert-dialog.tsx`, `popover.tsx`, `toast.tsx`, `sonner.tsx`, `tooltip.tsx` | Все компоненты обёрнуты в `Portal` Radix и имеют единый API для контролируемых/неконтролируемых состояний. |
| Компоновка | `ResponsiveLayout.tsx`, `ResponsiveGrid`, `ResponsiveStack`, `resizable.tsx` | Обеспечивают адаптивность и контроль за spacing — обязательны для новых экранов. |

> **Правило:** при создании нового UI-паттерна сначала проверьте, существует ли подходящий примитив в каталоге `ui/`. Дублирование код
ов запрещено.

---

## 🎛️ Плеер и управление воспроизведением

| Компонент | Расположение | Описание |
|-----------|--------------|----------|
| `GlobalAudioPlayer` | `src/components/player/GlobalAudioPlayer.tsx` | Основной плеер с поддержкой Media Session API, версий трека, клавиатурных шорткатов и управления очередью. Поддерживает desktop и mobile режимы через `useIsMobile`. |
| `MiniPlayer` | `src/components/player/MiniPlayer.tsx` | Минималистичный вид плеера для мобильных устройств; разворачивается в `FullScreenPlayer`. |
| `FullScreenPlayer` | `src/components/player/FullScreenPlayer.tsx` | Полноэкранный режим с визуализацией волн и расширенным контролем очереди. |
| `PlayerQueue` | `src/components/player/PlayerQueue.tsx` | Управление очередью, drag-and-drop с `@dnd-kit`. |

**Интеграции:** компоненты используют контекст `useAudioPlayer` и утилиту `formatTime`. При добавлении новых функций убедитесь, чт
о контекст и плеер остаются синхронизированными.

---

## 🎼 Генерация и управление контентом

| Компонент | Расположение | Назначение |
|-----------|--------------|------------|
| `MusicGenerator` | `src/components/MusicGenerator.tsx` | Форма генерации треков: поддерживает выбор провайдера, AI-пресеты, управление лирикой и историю стилей. Содержит вкладки Simple/Custom. |
| `LyricsEditor` | `src/components/LyricsEditor.tsx` | Вкладки AI и ручного ввода, интеграция с Supabase Edge Functions, отслеживание символов и предпросмотр. |
| `StyleRecommendationsPanel` | `src/components/workspace/StyleRecommendationsPanel.tsx` | Показывает рекомендации AI (STYLE-001). Комбинируется с данными `components.json`. |
| `TrackStemsPanel` | `src/components/tracks/TrackStemsPanel.tsx` | Управление генерацией и загрузкой стемов, поддержка разных режимов разделения. |
| `OptimizedTrackList` / `TracksList` | `src/components/OptimizedTrackList.tsx`, `src/components/TracksList.tsx` | Виртуализированные списки с фильтрами и skeleton-состояниями для больших библиотек. |

> **Совет:** компоненты генерации тесно связаны с хуками `useMusicGeneration`, `useTracks`, `useTrackRecovery`. При изменениях прове
ряйте совместимость типов и событий.

---

## 🧭 Навигация и рабочее пространство

| Компонент | Расположение | Возможности |
|-----------|--------------|-------------|
| `WorkspaceLayout` | `src/components/workspace/WorkspaceLayout.tsx` | Базовый шаблон рабочего стола: управляет областями контента, сайдбаром и верхней панелью. |
| `WorkspaceHeader` | `src/components/workspace/WorkspaceHeader.tsx` | Поиск, баланс провайдера, уведомления и профиль. Забирает данные через Supabase и `useProviderBalance`. |
| `MinimalSidebar` | `src/components/workspace/MinimalSidebar.tsx` | Компактный сайдбар с иконками и подсказками. |
| `BottomTabBar` | `src/components/navigation/BottomTabBar.tsx` | Мобильная таб-бар навигация с haptic feedback и бейджами уведомлений. |
| `MobileNavigation` | `src/components/navigation/MobileNavigation.tsx` | Мобильный drawer, комбинируется с `BottomTabBar`. |
| `NotificationsDropdown` | `src/components/workspace/NotificationsDropdown.tsx` | Центр уведомлений: группировка по типам, состояния загрузки, маркеры прочтения. |
| `UserProfileDropdown` | `src/components/workspace/UserProfileDropdown.tsx` | Менеджмент пользователя, быстрые настройки, выход из аккаунта. |

---

## 📐 Паттерны адаптивности и дизайн-система

1. **Responsive Layouts.** Используйте `ResponsiveLayout`, `ResponsiveGrid` и `ResponsiveStack` для всех новых страниц. Они уже подд
ерживают брейкпоинты Tailwind и синхронизированы с дизайн-системой (`UI_UX_DESIGN_SYSTEM.md`).
2. **Темизация.** Примитивы shadcn наследуют CSS-переменные Tailwind. Изменение темы выполняется через `next-themes`; для нового UI
обеспечьте поддержку светлой/тёмной схемы.
3. **Анимации.** В каталоге `animations/` содержатся готовые переходы. Для плеера используется сочетание Tailwind keyframes и CSS
переменных. Не добавляйте inline-animations без согласования с дизайн-гилдией.
4. **Состояния загрузки.** Любой компонент, работающий с сетью, должен предоставлять skeleton или shimmer (`LoadingSkeleton`, `Ske
leton`).

---

## ♿ Доступность и качество

- **ARIA-атрибуты:** `BottomTabBar` и `GlobalAudioPlayer` уже включают `role` и `aria-label`. При добавлении новых компонентов следу
йте их примеру.
- **Клавиатура:** Все интерактивные элементы обязаны иметь видимый фокус и реагировать на клавиши Enter/Space. Используйте `Button`
или `Link` из набора `ui/`.
- **Haptic Feedback:** для мобильных сценариев доступен хук `useHapticFeedback`. Он задействован в `BottomTabBar` — применяйте его
для жестов и основных действий на мобильных экранах.
- **Тесты:** компоненты покрываются unit-тестами (`__tests__`) и E2E проверками (Playwright). При добавлении новых UI элементов доб
авляйте smoke-тесты и stories (Storybook подключается в Sprint 25).

---

## 🛠️ Чек-лист при добавлении/обновлении компонента

1. **Проверить существующие примитивы.** Убедиться, что не дублируется функциональность.
2. **Следовать архитектуре.** Разместить файл в правильном каталоге (`ui/`, `player/`, `workspace/` и т.д.).
3. **Типизация.** Объявить Props через `interface` и экспортировать типы при необходимости.
4. **Состояния.** Реализовать loading/empty/error и добавить `aria-*` атрибуты.
5. **Логи.** Использовать `logger` для критических событий, избегать `console.*`.
6. **Документация.** Обновить этот реестр и `docs/COMPONENT_GUIDE.md`, указать сценарии использования.
7. **Тестирование.** Добавить unit-тесты, обновить Playwright сценарии, выполнить `npm run docs:validate`.

---

## 🔗 Связанные документы

- [UI/UX Design System](../UI_UX_DESIGN_SYSTEM.md)
- [Component Guide (code samples)](../COMPONENT_GUIDE.md)
- [Навигация по проекту](../../project-management/NAVIGATION_INDEX.md)
- [Current Sprint Tasks](../../project-management/tasks/current-sprint.md)

