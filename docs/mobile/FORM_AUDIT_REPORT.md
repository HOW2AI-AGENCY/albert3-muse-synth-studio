# 🎯 Аудит форм генерации музыки

**Дата**: 2025-11-05
**Версия**: 1.0.0
**Компоненты**: CompactCustomForm.tsx, SimpleModeCompact.tsx

---

## 📋 Обзор

Проведён аудит двух основных компонентов форм генерации музыки:
- `src/components/generator/forms/CompactCustomForm.tsx` — режим Custom
- `src/components/generator/forms/SimpleModeCompact.tsx` — режим Simple

---

## ❌ Выявленные проблемы

### P1 - Высокий приоритет

#### 1. HTML Семантика

**CompactCustomForm.tsx:**
```tsx
// ❌ ПРОБЛЕМА: Обёртка <div> вместо <form>
<div className="flex flex-col h-full pb-safe">
  <div className="flex-1 overflow-y-auto space-y-2 pb-20">
    {/* поля формы */}
  </div>
  <div className="absolute bottom-0 left-0 right-0 ...">
    {/* кнопка генерации */}
  </div>
</div>
```

**SimpleModeCompact.tsx:**
```tsx
// ❌ ПРОБЛЕМА: Обёртка <div> вместо <form>
<div className="flex flex-col h-full">
  {/* поля формы */}
</div>
```

**Почему это проблема:**
- Нет нативной функциональности формы (submit, validation)
- Хуже доступность для скрин-ридеров
- Не работает автозаполнение браузера
- Нет встроенной клавиатурной навигации (Enter для submit)

**Рекомендация:**
```tsx
// ✅ ПРАВИЛЬНО: Использовать <form> с onSubmit
<form
  onSubmit={(e) => {
    e.preventDefault();
    onGenerate();
  }}
  className="flex flex-col h-full pb-safe"
  aria-label="Форма генерации музыки"
>
  {/* поля формы */}
</form>
```

---

#### 2. Touch Targets (WCAG AAA)

**CompactCustomForm.tsx (lines 205-214):**
```tsx
// ❌ ПРОБЛЕМА: Кнопка History 24px × 24px
<Button
  variant="ghost"
  size="icon"
  onClick={onOpenHistory}
  disabled={isGenerating}
  className="h-6 w-6"  // ❌ 24px - ниже минимума 44px
>
  <History className="h-3 w-3" />
</Button>
```

**CompactCustomForm.tsx (lines 241-249):**
```tsx
// ❌ ПРОБЛЕМА: Кнопка AI Boost 24px × 24px
<Button
  variant="ghost"
  size="icon"
  className="absolute right-1 top-2 h-6 w-6"  // ❌ 24px
  onClick={onBoostPrompt}
>
  <Sparkles className="h-3.5 w-3.5" />
</Button>
```

**SimpleModeCompact.tsx (lines 57-67):**
```tsx
// ❌ ПРОБЛЕМА: Кнопка History 28px высота
<Button
  variant="ghost"
  size="sm"
  className="h-7 gap-1.5"  // ❌ 28px - ниже минимума 44px
  onClick={onOpenHistory}
>
  <History className="h-3.5 w-3.5" />
  История
</Button>
```

**Рекомендация:**
```tsx
// ✅ ПРАВИЛЬНО: Touch-optimized кнопки
<Button
  variant="ghost"
  size="icon"
  className="touch-target-min"  // 44px × 44px
  onClick={onOpenHistory}
  aria-label="История промптов"
>
  <History className="h-4 w-4" />
</Button>
```

---

#### 3. ARIA атрибуты

**Проблемы:**

1. **Кнопки без aria-label:**
```tsx
// ❌ ПРОБЛЕМА: Icon-only кнопки без aria-label
<Button
  variant="ghost"
  size="icon"
  onClick={onOpenHistory}
  className="h-6 w-6"
>
  <History className="h-3 w-3" />
</Button>

<Button
  variant="ghost"
  size="icon"
  onClick={onBoostPrompt}
>
  <Sparkles className="h-3.5 w-3.5" />
</Button>
```

2. **Collapsible секции:**
```tsx
// ❌ ПРОБЛЕМА: CollapsibleTrigger без явных ARIA атрибутов
<CollapsibleTrigger className="flex items-center justify-between w-full">
  <div className="flex items-center gap-2 text-sm font-medium">
    <ChevronDown className="h-4 w-4" />
    <span>Lyrics</span>
  </div>
</CollapsibleTrigger>
```

**Рекомендация:**
```tsx
// ✅ ПРАВИЛЬНО: Добавить ARIA атрибуты
<Button
  variant="ghost"
  size="icon"
  onClick={onOpenHistory}
  className="touch-target-min"
  aria-label="Открыть историю промптов"
>
  <History className="h-4 w-4" aria-hidden="true" />
</Button>

<CollapsibleTrigger
  className="flex items-center justify-between w-full"
  aria-label="Раздел текста песни"
>
  {/* content */}
</CollapsibleTrigger>
```

---

### P2 - Средний приоритет

#### 4. Footer позиционирование (CompactCustomForm)

**CompactCustomForm.tsx (lines 640-658):**
```tsx
// ❌ ПРОБЛЕМА: Absolute позиционирование footer
<div className="flex flex-col h-full pb-safe">
  <div className="flex-1 overflow-y-auto space-y-2 pb-20">
    {/* content с pb-20 чтобы не перекрыть footer */}
  </div>
  <div className="absolute bottom-0 left-0 right-0 border-t border-border/20 bg-background/95 backdrop-blur-sm p-3">
    {/* кнопка генерации */}
  </div>
</div>
```

**Проблемы:**
- Контент с `pb-20` может не учитывать реальную высоту footer
- На разных экранах footer может быть разной высоты
- Нет safe-area учёта в footer

**Решение:**
```tsx
// ✅ ВАРИАНТ 1: Sticky позиционирование (как в SimpleModeCompact)
<div className="flex flex-col h-full">
  <div className="flex-1 overflow-y-auto space-y-2 pb-20">
    {/* content */}
  </div>
  <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm safe-area-bottom">
    <div className="p-3">
      <Button>Создать музыку</Button>
    </div>
  </div>
</div>

// ✅ ВАРИАНТ 2: Flexbox подход (без absolute)
<form className="flex flex-col h-full">
  <div className="flex-1 overflow-y-auto space-y-2">
    {/* content */}
  </div>
  <div className="flex-shrink-0 border-t border-border/20 bg-background/95 backdrop-blur-sm safe-area-bottom p-3">
    <Button>Создать музыку</Button>
  </div>
</form>
```

---

#### 5. Группировка полей

**Проблема:**
Связанные поля не группируются через `<fieldset>` и `<legend>`

**Рекомендация:**
```tsx
// ✅ ПРАВИЛЬНО: Группировка через fieldset
<form className="flex flex-col h-full">
  <fieldset className="flex-1 overflow-y-auto space-y-2">
    <legend className="sr-only">Параметры генерации</legend>

    {/* Title */}
    <div className="space-y-1 p-2">
      <Label htmlFor="custom-title">Название</Label>
      <Input id="custom-title" {...props} />
    </div>

    {/* Prompt */}
    <div className="space-y-1 p-2">
      <Label htmlFor="custom-prompt">Стиль музыки</Label>
      <Textarea id="custom-prompt" {...props} />
    </div>
  </fieldset>

  <div className="flex-shrink-0 p-3">
    <Button type="submit">Создать музыку</Button>
  </div>
</form>
```

---

## 📊 Приоритизация исправлений

### P1 - Высокий приоритет (Обязательно)

1. ✅ **Touch targets** → 44px minimum
   - История: h-6 w-6 → touch-target-min
   - AI Boost: h-6 w-6 → touch-target-min
   - SimpleModeCompact History: h-7 → touch-target-min

2. ✅ **ARIA labels**
   - Все icon-only кнопки
   - Collapsible triggers
   - Form и fieldset labels

3. ✅ **HTML Семантика**
   - `<div>` → `<form>` с onSubmit
   - Добавить `type="submit"` на кнопку генерации

### P2 - Средний приоритет (Желательно)

4. ⏳ **Footer позиционирование**
   - CompactCustomForm: absolute → sticky или flexbox
   - Добавить safe-area-bottom

5. ⏳ **Группировка полей**
   - Добавить `<fieldset>` и `<legend>`
   - Улучшить структуру для скрин-ридеров

---

## 📈 Ожидаемые улучшения

### До исправлений
- ❌ Touch targets 24px-28px (ниже WCAG минимума)
- ❌ Отсутствие семантической разметки формы
- ❌ Icon-only кнопки без aria-label
- ❌ Footer с absolute позиционированием
- ❌ Нет группировки полей

### После исправлений
- ✅ Touch targets 44px (WCAG AAA)
- ✅ Семантическая разметка `<form>`
- ✅ ARIA labels на всех интерактивных элементах
- ✅ Footer с правильным позиционированием + safe-area
- ✅ Группировка полей через `<fieldset>`

---

## 🎯 План реализации

### Шаг 1: Touch targets (P1)
- [ ] CompactCustomForm: History button (line 205)
- [ ] CompactCustomForm: AI Boost button (line 241)
- [ ] SimpleModeCompact: History button (line 57)

### Шаг 2: ARIA атрибуты (P1)
- [ ] CompactCustomForm: История, Boost, Collapsible triggers
- [ ] SimpleModeCompact: История, Collapsible triggers
- [ ] Добавить aria-hidden="true" на иконки

### Шаг 3: HTML Семантика (P1)
- [ ] CompactCustomForm: `<div>` → `<form>`
- [ ] SimpleModeCompact: `<div>` → `<form>`
- [ ] Добавить `onSubmit` handler
- [ ] Кнопка генерации: добавить `type="submit"`

### Шаг 4: Footer (P2)
- [ ] CompactCustomForm: absolute → sticky/flexbox
- [ ] Добавить safe-area-bottom

### Шаг 5: Группировка (P2)
- [ ] Добавить `<fieldset>` и `<legend>`
- [ ] Улучшить структуру accessibility

---

**Следующий шаг**: Начать реализацию с P1 задач (Touch targets и ARIA)
