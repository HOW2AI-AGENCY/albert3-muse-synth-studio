# Virtualization Guide

**Проект:** Albert3 Muse Synth Studio  
**Версия:** 2.4.0  
**Обновлено:** 2025-02-07

---

## Введение

Виртуализация — это техника рендеринга только видимых элементов списка/сетки для драматического улучшения производительности при работе с большими объемами данных.

### Когда использовать виртуализацию

✅ **Используйте виртуализацию:**
- Списки/сетки с **100+ элементами**
- Динамический контент, который часто меняется
- Окружения с ограниченной памятью (мобильные устройства)
- При заметных лагах скроллинга

❌ **Не используйте виртуализацию:**
- Списки с < 50 элементами (overhead не оправдан)
- Статические списки, которые не скроллятся
- Когда нужен полный контроль над DOM (drag-and-drop, сложные анимации)

---

## Архитектура

### Используемая библиотека

Проект использует **`@tanstack/react-virtual`** — легковесную (< 5KB), производительную библиотеку для виртуализации.

**Преимущества:**
- Zero dependencies
- Framework-agnostic core
- Поддержка динамических размеров элементов
- Отличная TypeScript поддержка
- Активная поддержка от создателей TanStack Query

### Основные концепции

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,              // Общее количество элементов
  getScrollElement: () => parentRef.current, // Скроллируемый контейнер
  estimateSize: () => 100,          // Предполагаемая высота/ширина элемента
  overscan: 5,                      // Количество элементов вне viewport для рендера
});
```

**Ключевые параметры:**
- **count**: Общее количество элементов в списке
- **getScrollElement**: Функция, возвращающая скроллируемый DOM элемент
- **estimateSize**: Предполагаемая высота элемента (для списков) или ширина (для горизонтальных списков)
- **overscan**: Количество элементов для рендера за пределами видимой области (для плавного скроллинга)

---

## Реализация

### Пример 1: Простой виртуализированный список

```typescript
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps {
  items: { id: string; name: string }[];
}

export const VirtualList = ({ items }: VirtualListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Высота каждого элемента ~50px
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item.name}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### Пример 2: Виртуализированный список с мемоизированными items

```typescript
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ListItemProps {
  item: { id: string; title: string };
  onSelect: (id: string) => void;
}

// Мемоизированный item компонент
const ListItem = React.memo(({ item, onSelect }: ListItemProps) => {
  return (
    <div
      className="p-4 hover:bg-accent cursor-pointer"
      onClick={() => onSelect(item.id)}
    >
      {item.title}
    </div>
  );
});

ListItem.displayName = 'ListItem';

interface VirtualListWithItemsProps {
  items: { id: string; title: string }[];
  onSelect: (id: string) => void;
}

export const VirtualListWithItems = ({
  items,
  onSelect,
}: VirtualListWithItemsProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ListItem item={item} onSelect={onSelect} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### Пример 3: Виртуализированная Grid (2D)

```typescript
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualGridProps {
  items: { id: string; title: string }[];
  columns: number;
}

export const VirtualGrid = ({ items, columns }: VirtualGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Высота строки
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex gap-4 p-4">
                {rowItems.map((item) => (
                  <div key={item.id} className="flex-1 bg-card p-4 rounded">
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## Best Practices

### 1. Мемоизация Item Компонентов

**Всегда** оборачивайте item компоненты в `React.memo`:

```typescript
// ✅ ПРАВИЛЬНО
const ListItem = React.memo(({ item, onSelect }) => {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>;
});

ListItem.displayName = 'ListItem';

// ❌ НЕПРАВИЛЬНО
const ListItem = ({ item, onSelect }) => {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>;
};
```

### 2. Использование стабильных ключей

**Всегда** используйте стабильные ID, **не индексы массива**:

```typescript
// ✅ ПРАВИЛЬНО
{virtualizer.getVirtualItems().map((virtualItem) => {
  const item = items[virtualItem.index];
  return <div key={item.id}>...</div>; // Используем item.id
})}

// ❌ НЕПРАВИЛЬНО
{virtualizer.getVirtualItems().map((virtualItem, index) => {
  return <div key={index}>...</div>; // Индекс нестабилен!
})}
```

### 3. Точная оценка размера

Используйте реалистичные `estimateSize` значения:

```typescript
// ✅ ПРАВИЛЬНО: Точная оценка на основе реального размера
estimateSize: () => 120, // Card высота: padding(16) + content(80) + gap(12) = ~120px

// ❌ НЕПРАВИЛЬНО: Слишком маленькое значение
estimateSize: () => 50, // Если реальная высота 120px, будет прыгать при скролле
```

### 4. Оптимальный overscan

Подбирайте `overscan` в зависимости от скорости скроллинга:

```typescript
// Для обычных списков
overscan: 5,

// Для быстрого скроллинга (например, большие карточки)
overscan: 3,

// Для медленного скроллинга (маленькие items)
overscan: 10,
```

### 5. Мониторинг производительности

Используйте React DevTools Profiler для проверки:

```typescript
import { Profiler } from 'react';

<Profiler
  id="VirtualList"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} (${phase}) took ${actualDuration}ms`);
  }}
>
  <VirtualList items={items} />
</Profiler>
```

---

## Примеры из проекта

### PromptHistoryVirtualList

**Файл:** `src/components/generator/prompt-history/PromptHistoryVirtualList.tsx`

```typescript
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // Card высота
  overscan: 5,
});
```

**Результаты:**
- Render time: 150ms → 18ms (-88%)
- Memory usage: -60%
- Поддержка 1000+ items

### LyricsVirtualGrid

**Файл:** `src/components/lyrics/LyricsVirtualGrid.tsx`

```typescript
const rowVirtualizer = useVirtualizer({
  count: Math.ceil(lyrics.length / columns),
  getScrollElement: () => parentRef.current,
  estimateSize: () => 250, // Grid row height
  overscan: 3,
});
```

**Результаты:**
- Render time: 850ms → 42ms (-95%)
- Memory usage: -70%
- Поддержка 10,000+ items

### VirtualizedFolderList

**Файл:** `src/components/lyrics/VirtualizedFolderList.tsx`

```typescript
const rowVirtualizer = useVirtualizer({
  count: folders.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 40, // Button height
  overscan: 3,
});
```

**Результаты:**
- Sidebar рендер: 45ms → 15ms (-67%) при 50+ папках

---

## Troubleshooting

### Проблема: Элементы "прыгают" при скролле

**Причина:** Неточная оценка размера (`estimateSize`)

**Решение:**
```typescript
// Измерьте реальную высоту элемента в DevTools
// Затем используйте точное значение
estimateSize: () => 142, // Вместо 100
```

### Проблема: Медленный скроллинг

**Причина:** Слишком большой `overscan` или не мемоизированные items

**Решение:**
```typescript
// 1. Уменьшите overscan
overscan: 3, // Вместо 10

// 2. Мемоизируйте item компонент
const ListItem = React.memo(({ item }) => <div>{item.name}</div>);
```

### Проблема: Высокое потребление памяти

**Причина:** Рендеринг слишком большого количества элементов вне viewport

**Решение:**
```typescript
// Уменьшите overscan до минимума
overscan: 2,
```

### Проблема: Ошибка "Cannot read property 'current' of null"

**Причина:** `parentRef` не установлен

**Решение:**
```typescript
// Убедитесь, что ref присвоен корректно
<div ref={parentRef} className="overflow-auto">
  {/* ... */}
</div>
```

---

## Testing

### Unit Testing виртуализированных компонентов

```typescript
import { render, screen } from '@testing-library/react';
import { VirtualList } from './VirtualList';

describe('VirtualList', () => {
  it('renders visible items only', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    render(<VirtualList items={items} />);

    // Проверяем, что рендерятся не все 1000 элементов
    const renderedItems = screen.queryAllByText(/Item \d+/);
    expect(renderedItems.length).toBeLessThan(100); // Только видимые + overscan
  });
});
```

### Performance Testing

```typescript
import { bench } from 'vitest';
import { render } from '@testing-library/react';

bench('VirtualList - 1000 items', () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
  }));

  render(<VirtualList items={items} />);
});
```

---

## Ресурсы

### Документация
- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [React.memo Documentation](https://react.dev/reference/react/memo)

### Примеры в проекте
- `src/components/generator/prompt-history/` — Virtualized prompt history
- `src/components/lyrics/LyricsVirtualGrid.tsx` — Virtualized grid
- `src/components/lyrics/VirtualizedFolderList.tsx` — Virtualized folder list

### Performance Reports
- `reports/performance/WEEK_2_VIRTUALIZATION_REPORT.md` — Детальный отчёт

---

**Версия документа:** 1.0  
**Последнее обновление:** 2025-02-07
