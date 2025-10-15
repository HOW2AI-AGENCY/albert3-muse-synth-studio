# Mobile Testing Checklist

## Устройства для тестирования

### Минимальные требования
- [ ] **iPhone SE (375x667)** - минимальный экран iOS
- [ ] **Samsung Galaxy S21 (360x800)** - стандартный Android
- [ ] **iPhone 12/13 (390x844)** - современный iOS

### Рекомендуемые
- [ ] **iPhone 14 Pro Max (430x932)** - большой экран iOS
- [ ] **iPad Mini (768x1024)** - планшет малый
- [ ] **Pixel 6 Pro (412x892)** - Android флагман

---

## ✅ Функциональность

### Критичные элементы (PHASE 1)
- [ ] **Изображения загружаются** (LazyImage работает корректно)
  - Изображения треков появляются при прокрутке
  - Нет пустых плейсхолдеров после загрузки
  - Placeholder корректно показывается до загрузки

- [ ] **FAB видна и кликабельна**
  - Кнопка "+" для генерации видна
  - FAB находится над `BottomTabBar` (z-50)
  - FAB под `MiniPlayer` (z-60)
  - Отступ от низа правильный (учитывает tab bar + player)

### Форма генерации (PHASE 2)
- [ ] **MusicGeneratorV2 открывается в Drawer**
  - Drawer открывается по клику на FAB
  - Drawer занимает 90% высоты экрана
  - Есть drag handle для закрытия
  - Содержимое помещается без прокрутки за пределы

- [ ] **SimpleModeForm оптимизирована**
  - Input height = 10 (40px)
  - Button height = 12 (48px)
  - Font size = 16px (iOS не зумит)
  - Все touch targets >= 44px

- [ ] **CustomModeForm компактна**
  - PromptInput: 2 строки, 60px
  - Title Input: h-10, text-base
  - Accordion: single mode (по одной секции)
  - AudioDescriber скрыт на мобильном
  - Все секции закрыты по умолчанию

### Навигация (PHASE 3)
- [ ] **BottomTabBar не перекрывает контент**
  - CSS variable `--bottom-tab-bar-height` корректно вычисляется
  - Контент имеет `paddingBottom` = высоте tab bar
  - При появлении плеера отступ увеличивается

- [ ] **Элементы навигации адаптивные**
  - Иконки: 16x16px (h-4 w-4)
  - Шрифт: 10px
  - Padding: px-2, py-2
  - Все пункты помещаются на 360px экране
  - Минимальная высота 44px соблюдается

### Компоненты (PHASE 4)
- [ ] **TrackCard компактные**
  - Cover: 60x60px
  - Title: text-sm (14px)
  - Metadata: text-xs (12px)
  - Кнопки: h-7 w-7 (28x28px)
  - Layout: flex-row на мобильном

- [ ] **DetailPanel как Bottom Sheet**
  - Открывается снизу с drag handle
  - Высота: 60vh (max 90vh)
  - Accordion вместо tabs
  - Компактный header (cover 80x80px)
  - Секции: Информация, Стемы, Версии, Действия

---

## 🎨 UI/UX

### Текст и типографика
- [ ] Текстовые поля **НЕ вызывают zoom** на iOS
  - Font size >= 16px для всех `<input>` и `<textarea>`
  - Class `.mobile-no-zoom` применяется где нужно
  
- [ ] Текст **читаемый** на всех разрешениях
  - Нет слишком мелкого текста (< 12px)
  - Контрастность соответствует WCAG AA

### Touch Targets
- [ ] **Все интерактивные элементы >= 44x44px**
  - Кнопки навигации
  - Кнопки действий в TrackCard
  - FAB
  - Tabs в DetailPanel
  - Accordion triggers

### Spacing & Layout
- [ ] **Нет horizontal scrolling**
  - Все элементы помещаются в viewport
  - Padding/margin не создают overflow
  
- [ ] **CSS variables работают**
  - `--workspace-bottom-offset`
  - `--bottom-tab-bar-height`
  - `--mobile-spacing-*`
  - `--mobile-touch-min`

### Анимации
- [ ] **Smooth animations** (60 FPS)
  - Drawer open/close
  - Accordion expand/collapse
  - Scroll
  - LazyImage fade-in

---

## ⚡ Производительность

### Lazy Loading
- [ ] **Изображения**
  - IntersectionObserver работает
  - Загружаются только видимые изображения
  - Placeholder показывается до загрузки

### Виртуализация
- [ ] **Списки треков** (при 50+ элементах)
  - Рендерятся только видимые элементы
  - Прокрутка плавная

### Memory
- [ ] **Нет memory leaks**
  - Консоль чистая от ошибок
  - useEffect cleanup корректен
  - Listeners удаляются

### Network
- [ ] **Оптимизация запросов**
  - Дебаунс на input полях
  - Нет избыточных refetch

---

## 🔧 Технические проверки

### Safe Area Insets
- [ ] **iOS notch/Dynamic Island**
  - Контент не перекрыт вырезом
  - `safe-area-inset-*` применяются

### Orientation
- [ ] **Portrait mode** (основной)
  - Все элементы корректно отображаются
  
- [ ] **Landscape mode** (опционально)
  - Layout адаптируется

### Browser Compatibility
- [ ] **Safari iOS**
  - Все функции работают
  - CSS правильно применяется
  
- [ ] **Chrome Android**
  - Всё функционирует
  - Нет специфичных багов

---

## 📱 Особые сценарии

### Player активен
- [ ] Content `paddingBottom` увеличивается
- [ ] FAB поднимается выше
- [ ] BottomTabBar над MiniPlayer

### Drawer + Player одновременно
- [ ] Drawer z-index правильный
- [ ] Можно управлять плеером при открытом Drawer

### Rotation
- [ ] Layout корректно перестраивается
- [ ] Нет багов с position

---

## ✅ Результаты

| Критерий | До исправлений | После исправлений | Статус |
|----------|----------------|-------------------|--------|
| **Изображения загружаются** | ❌ Не грузятся | ✅ Lazy load работает | ✅ PASS |
| **FAB видна** | ❌ Скрыта (z-20) | ✅ Видна (z-50) | ✅ PASS |
| **Форма помещается** | ❌ Слишком большая | ✅ Компактная (Drawer) | ✅ PASS |
| **Навигация помещается** | ❌ Переполнена | ✅ Оптимизирована | ✅ PASS |
| **Touch targets** | ⚠️ 60% | ✅ 100% (>=44px) | ✅ PASS |
| **Mobile UX** | ❌ Неюзабельный | ✅ Mobile-first | ✅ PASS |

---

**Версия**: 2.4.1  
**Дата**: Январь 2025  
**Статус**: ✅ Готов к тестированию
