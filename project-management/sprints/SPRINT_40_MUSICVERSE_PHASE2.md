# Sprint 40: MusicVerse UI/UX Phase 2 - Core Components

**Даты**: 28 ноября - 5 декабря 2025
**Статус**: 📋 Запланирован
**Приоритет**: MusicVerse Specification Implementation

---

## 🎯 Цели спринта

### Основная цель
Реализовать Phase 2 MusicVerse UI/UX спецификации, фокусируясь на критических компонентах для улучшенного пользовательского опыта: SwipeableTrackCard, EnhancedAudioPlayer, и QuickActionSheet.

### Ключевые метрики успеха
- ✅ 3 новых MusicVerse компонента (SwipeableTrackCard, EnhancedAudioPlayer, QuickActionSheet)
- ✅ MusicVerse compliance score: 85%+ (up from 75%)
- ✅ Mobile gesture support: 100%
- ✅ Performance: 60fps на всех анимациях

---

## 📋 Задачи спринта

### P0: Core MusicVerse Components

#### 1. SwipeableTrackCard - Мобильный трек с жестами
**Приоритет:** P0
**Оценка:** 6 часов
**Ответственный:** Frontend Team

**Описание:**
Улучшенная версия TrackCard с поддержкой swipe-жестов для быстрых действий.

**Функциональность:**
- [ ] **Swipe Right (→):** Добавить в избранное
- [ ] **Swipe Left (←):** Показать дополнительные действия
- [ ] **Long Press:** Быстрое меню (контекстное)
- [ ] **Haptic Feedback:** Вибрация при свайпе (iOS/Android)
- [ ] **Visual Feedback:** Цветные индикаторы действий
- [ ] **Spring Animations:** Плавный возврат в исходное положение

**Технические требования:**
- Использовать `framer-motion` для drag/swipe
- Touch targets ≥48px (WCAG AAA)
- 60fps анимации
- Threshold: 50% ширины для action trigger
- Prevent vertical scroll conflict

**Компоненты:**
```typescript
interface SwipeableTrackCardProps {
  track: Track;
  onPlay: (trackId: string) => void;
  onLike: (trackId: string) => void;
  onAddToPlaylist?: (trackId: string) => void;
  onShare?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  swipeThreshold?: number; // default: 0.5
  enableHaptics?: boolean; // default: true
}
```

**Критерии приемки:**
- Swipe жесты работают плавно на iOS и Android
- Haptic feedback активируется корректно
- Нет конфликтов с вертикальным скроллом
- Анимации 60fps
- Accessibility: keyboard navigation работает

**Файлы:**
- Создать: `src/components/tracks/SwipeableTrackCard.tsx`
- Обновить: `src/pages/Library.tsx` (опционально использовать новый компонент)

---

#### 2. EnhancedAudioPlayer - Полнофункциональный плеер
**Приоритет:** P0
**Оценка:** 8 часов
**Ответственный:** Frontend Team

**Описание:**
Расширенный аудио-плеер с waveform visualization, playlist queue, и расширенными контролами.

**Функциональность:**
- [ ] **Waveform Visualization:** Интеграция WaveformProgressBar
- [ ] **Playlist Queue:** Очередь воспроизведения с drag-to-reorder
- [ ] **Speed Control:** 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- [ ] **Loop Modes:** None, Track, Playlist
- [ ] **EQ Presets:** Bass Boost, Treble Boost, Vocal, Flat
- [ ] **Sleep Timer:** 5min, 10min, 15min, 30min, 1hr
- [ ] **Lyrics Display:** Synchronized lyrics (если доступны)
- [ ] **Glassmorphic Background:** MusicVerse styling

**Технические требования:**
- Web Audio API для EQ и speed control
- IndexedDB для сохранения queue
- Keyboard shortcuts (Space, ArrowLeft, ArrowRight)
- Media Session API для OS integration
- Picture-in-Picture mode (опционально)

**Компоненты:**
```typescript
interface EnhancedAudioPlayerProps {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onLoopModeChange: (mode: 'none' | 'track' | 'playlist') => void;
  onQueueReorder: (newQueue: Track[]) => void;
}
```

**Критерии приемки:**
- Все контролы работают корректно
- EQ presets применяются в реальном времени
- Queue сохраняется при обновлении страницы
- Keyboard shortcuts работают
- Media Session API интегрирован
- Glassmorphic дизайн соответствует MusicVerse

**Файлы:**
- Создать: `src/components/player/EnhancedAudioPlayer.tsx`
- Создать: `src/components/player/PlaylistQueue.tsx`
- Создать: `src/components/player/SpeedControl.tsx`
- Создать: `src/components/player/EQControl.tsx`
- Обновить: `src/contexts/audio-player/AudioPlayerContext.tsx`

---

#### 3. QuickActionSheet - Bottom Sheet для мобильных
**Приоритет:** P0
**Оценка:** 4 часа
**Ответственный:** Frontend Team

**Описание:**
Нативный bottom sheet для быстрых действий на мобильных устройствах.

**Функциональность:**
- [ ] **Slide-up Animation:** Плавное появление снизу
- [ ] **Drag-to-dismiss:** Свайп вниз для закрытия
- [ ] **Backdrop Blur:** Glassmorphic фон
- [ ] **Action Groups:** Группировка действий
- [ ] **Destructive Actions:** Красный цвет для опасных действий
- [ ] **Safe Area Insets:** Поддержка iPhone notch

**Технические требования:**
- Framer Motion для анимаций
- Portal для рендеринга
- Focus trap для accessibility
- Prevent body scroll when open
- Escape key для закрытия

**Компоненты:**
```typescript
interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
  }>;
  showHandle?: boolean; // drag handle
}
```

**Критерии приемки:**
- Анимации плавные (60fps)
- Drag-to-dismiss работает интуитивно
- Safe area insets учтены
- Accessibility: focus management
- Works on iOS, Android, Desktop

**Файлы:**
- Создать: `src/components/ui/quick-action-sheet.tsx`
- Примеры использования в TrackCard, Library

---

### P1: Performance & Animation Enhancements

#### 4. Scroll Performance Optimization
**Приоритет:** P1
**Оценка:** 4 часа
**Ответственный:** Frontend Team

**Задачи:**
- [ ] Implement Virtual Scrolling для Library (react-window или @tanstack/react-virtual)
- [ ] Lazy Loading для обложек треков
- [ ] Debounce scroll events
- [ ] Optimize re-renders в TrackCard

**Критерии приемки:**
- Library scrolls at 60fps с 1000+ треками
- Images lazy load корректно
- No jank при быстром скролле

**Файлы:**
- `src/pages/Library.tsx`
- `src/components/tracks/TrackCard.tsx`

---

#### 5. Animation Performance Audit
**Приоритет:** P1
**Оценка:** 3 часа
**Ответственный:** Frontend Team

**Задачи:**
- [ ] Профилирование всех анимаций (Chrome DevTools)
- [ ] Optimize framer-motion animations
- [ ] Use CSS transforms вместо position changes
- [ ] Reduce paint areas
- [ ] will-change hints для анимированных элементов

**Критерии приемки:**
- Все анимации 60fps на mid-range devices
- Paint flashing минимизирован
- No layout thrashing

---

### P2: Additional MusicVerse Components

#### 6. GenreFilterChips - Фильтры жанров
**Приоритет:** P2
**Оценка:** 3 часа
**Ответственный:** Frontend Team

**Описание:**
Горизонтальный scrollable список чипов для фильтрации по жанрам.

**Функциональность:**
- [ ] Horizontal scroll с snap points
- [ ] Multi-select режим
- [ ] Active state с glassmorphic highlight
- [ ] Keyboard navigation

**Файлы:**
- Создать: `src/components/filters/GenreFilterChips.tsx`

---

#### 7. TrendingBadge - Индикатор трендов
**Приоритет:** P2
**Оценка:** 2 часа
**Ответственный:** Frontend Team

**Описание:**
Анимированный badge для трендовых треков.

**Функциональность:**
- [ ] Fire animation (Lottie или CSS)
- [ ] Pulsing glow effect
- [ ] Auto-hide после 3 секунд

**Файлы:**
- Создать: `src/components/ui/trending-badge.tsx`

---

## 📊 Метрики успеха спринта

### Обязательные
- [ ] Все P0 компоненты реализованы и протестированы
- [ ] MusicVerse compliance: 85%+ (up from 75%)
- [ ] Mobile gesture support работает на iOS/Android
- [ ] Performance: 60fps на всех анимациях

### Желательные
- [ ] P1 задачи завершены (100%)
- [ ] P2 компоненты реализованы (≥50%)
- [ ] Lighthouse Performance Score ≥90
- [ ] Accessibility Score ≥95

---

## 🔗 Связанные документы

- **Sprint 39:** [SPRINT_39_MOBILE_UX_POLISH.md](./SPRINT_39_MOBILE_UX_POLISH.md)
- **UI/UX Compliance:** [docs/audit/UI_UX_COMPLIANCE_REPORT_2025-11-19.md](../../docs/audit/UI_UX_COMPLIANCE_REPORT_2025-11-19.md)
- **MusicVerse Spec:** docs/design/MUSICVERSE_SPECIFICATION.md (if exists)

---

## 📅 График выполнения

### День 1-2 (28-29 ноября)
- SwipeableTrackCard базовая реализация
- QuickActionSheet компонент

### День 3-4 (30 ноября - 1 декабря)
- SwipeableTrackCard: haptics + анимации
- EnhancedAudioPlayer: базовая структура

### День 5-6 (2-3 декабря)
- EnhancedAudioPlayer: EQ, speed, queue
- Scroll Performance Optimization

### День 7-8 (4-5 декабря)
- Animation Performance Audit
- GenreFilterChips + TrendingBadge
- Финальное тестирование

---

## 🎯 Definition of Done

Спринт считается завершенным, когда:

1. **Функциональность:**
   - ✅ SwipeableTrackCard с жестами
   - ✅ EnhancedAudioPlayer с EQ и queue
   - ✅ QuickActionSheet для мобильных

2. **Качество:**
   - ✅ Все анимации 60fps
   - ✅ Gesture conflicts resolved
   - ✅ Accessibility compliance

3. **Документация:**
   - ✅ Component docs с примерами
   - ✅ README обновлен
   - ✅ CHANGELOG обновлен

4. **Деплой:**
   - ✅ PR создан и одобрен
   - ✅ QA testing пройден
   - ✅ Deployed to production

---

**Создан:** 2025-11-19
**Автор:** Development Team
**Статус:** Готов к началу после Sprint 39
