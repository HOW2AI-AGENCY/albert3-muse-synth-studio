# 🎵 План дальнейшего рефакторинга MusicGeneratorV2

## ✅ Реализовано (Версия 1.0)

### Текущие улучшения:
1. **Двухрежимная форма**: Simple/Custom режимы с табами
2. **Boost Style интегрирован**: Кнопка ✨ для AI-улучшения промпта
3. **Автогенерация лирики**: 
   - Polling механизм для получения результатов
   - Автопереключение на Custom режим
   - Автоподстановка текста в форму
4. **Логирование**: Все действия логируются через logger
5. **UX улучшения**:
   - Simple mode: минималистичный интерфейс (промпт + instrumental toggle)
   - Custom mode: полный контроль над параметрами
   - Boost кнопка активна только при непустом промпте

---

## 📋 Следующие шаги (Версия 2.0)

### Phase 1: Модульная структура

#### 1.1 Создать отдельные компоненты (не файлы, а внутренние)

```typescript
// В MusicGeneratorV2.tsx создать внутренние компоненты:

// Header Component
const GeneratorHeader = memo(({ 
  mode, 
  onModeChange, 
  modelVersion, 
  onModelChange 
}: GeneratorHeaderProps) => {
  // ... header logic
});

// Simple Mode Form
const SimpleModeForm = memo(({ 
  params, 
  setParam, 
  onBoost, 
  isGenerating, 
  isBoosting,
  onLyricsClick,
  onAudioClick 
}: SimpleModeFormProps) => {
  // ... simple form
});

// Custom Mode Form
const CustomModeForm = memo(({ 
  params, 
  setParam, 
  onBoost, 
  isGenerating, 
  isBoosting,
  onLyricsClick,
  onAudioClick,
  advancedOpen,
  setAdvancedOpen
}: CustomModeFormProps) => {
  // ... custom form with all fields
});
```

**Преимущества**:
- Легче читать и поддерживать
- Независимое тестирование
- Переиспользование компонентов
- Мемоизация для производительности

#### 1.2 Вынести типы в отдельную секцию

```typescript
// Types section в начале файла
type VocalGender = 'any' | 'female' | 'male' | 'instrumental';
type GeneratorMode = 'simple' | 'custom';

interface GenerationParams {
  prompt: string;
  title: string;
  lyrics: string;
  tags: string;
  negativeTags: string;
  vocalGender: VocalGender;
  modelVersion: string;
  referenceAudioUrl: string | null;
  referenceFileName: string | null;
  audioWeight: number;
  styleWeight: number;
  lyricsWeight: number;
  weirdness: number;
}

interface GeneratorHeaderProps { /* ... */ }
interface SimpleModeFormProps { /* ... */ }
interface CustomModeFormProps { /* ... */ }
```

---

### Phase 2: Улучшение UI/UX

#### 2.1 Добавить Tags Carousel (горизонтальная прокрутка)

```typescript
// Inspiration tags для Simple Mode
const inspirationTags = [
  'synthwave', 'dream pop', 'indie rock', 
  'electronic', 'ambient', 'lo-fi'
];

// Component:
const TagsCarousel = ({ tags, onTagClick }: TagsCarouselProps) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {tags.map(tag => (
          <Button
            key={tag}
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onTagClick(tag)}
          >
            <Plus className="w-3 h-3 mr-1" />
            {tag}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};
```

#### 2.2 Collapsible секции для Custom Mode

```typescript
// Вместо Accordion использовать Collapsible для:
// - Lyrics Section (с AI кнопкой)
// - Advanced Settings

<Collapsible open={lyricsOpen} onOpenChange={setLyricsOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full">
    <span>Lyrics</span>
    <Button variant="ghost" size="icon" onClick={handleGenerateLyrics}>
      <Wand2 className="h-4 w-4" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <Textarea value={lyrics} onChange={...} />
  </CollapsibleContent>
</Collapsible>
```

#### 2.3 Градиентная кнопка Create

```typescript
<Button
  className="w-full h-12 bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 
             hover:from-orange-600 hover:via-pink-600 hover:to-rose-600
             shadow-lg shadow-pink-500/25"
  onClick={handleGenerate}
>
  <Music className="w-4 w-4 mr-2" />
  Create
</Button>
```

---

### Phase 3: Интеграция Lyrics Variants

#### 3.1 Создать LyricsVariantSelector Dialog

```typescript
// src/components/lyrics/LyricsVariantSelector.tsx
interface LyricsVariant {
  id: string;
  title: string;
  content: string;
  variant_index: number;
}

export function LyricsVariantSelector({ 
  variants, 
  onSelect, 
  open, 
  onOpenChange 
}: LyricsVariantSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Выберите вариант текста ({variants.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px]">
          {variants.map((variant, idx) => (
            <Card 
              key={variant.id}
              className="mb-3 cursor-pointer hover:border-primary"
              onClick={() => onSelect(variant.content)}
            >
              <CardHeader>
                <CardTitle className="text-sm">
                  Вариант {idx + 1}: {variant.title || 'Без названия'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap">
                  {variant.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3.2 Обновить LyricsGeneratorDialog

Вместо автовыбора первого варианта, показывать все:

```typescript
if (jobData.status === 'completed' && jobData.lyrics_variants?.length > 0) {
  clearInterval(pollInterval);
  
  // Если один вариант - автовыбор
  if (jobData.lyrics_variants.length === 1) {
    onGenerated(jobData.lyrics_variants[0].content);
  } else {
    // Если несколько - показать selector
    setVariants(jobData.lyrics_variants);
    setVariantSelectorOpen(true);
  }
}
```

---

### Phase 4: Валидация через Zod

#### 4.1 Создать schemas

```typescript
// src/schemas/generator.schema.ts
import { z } from 'zod';

export const SimpleModeSchema = z.object({
  prompt: z.string()
    .min(10, 'Минимум 10 символов')
    .max(500, 'Максимум 500 символов'),
  isInstrumental: z.boolean().default(false),
  modelVersion: z.enum(['V5', 'V4_5PLUS', 'V4_5', 'V4', 'V3_5']).default('V5')
});

export const CustomModeSchema = SimpleModeSchema.extend({
  title: z.string().max(100).optional(),
  tags: z.string().max(200).optional(),
  lyrics: z.string().max(3000).optional(),
  negativeTags: z.string().max(200).optional(),
  vocalGender: z.enum(['any', 'female', 'male', 'instrumental']),
  audioWeight: z.number().min(0).max(100),
  styleWeight: z.number().min(0).max(100),
  lyricsWeight: z.number().min(0).max(100),
  weirdness: z.number().min(0).max(100)
});

export type SimpleModeParams = z.infer<typeof SimpleModeSchema>;
export type CustomModeParams = z.infer<typeof CustomModeSchema>;
```

#### 4.2 Использовать в handleGenerate

```typescript
const handleGenerate = useCallback(async () => {
  const schema = mode === 'simple' ? SimpleModeSchema : CustomModeSchema;
  const parseResult = schema.safeParse(params);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    toast({
      variant: 'destructive',
      title: 'Ошибка валидации',
      description: firstError.message
    });
    return;
  }
  
  // Continue with generation...
}, [mode, params]);
```

---

### Phase 5: Анимации и transitions

#### 5.1 Добавить анимации для:

**Boost кнопки**:
```css
@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(5deg); }
}

.boost-button:hover {
  animation: sparkle 0.6s ease-in-out;
}
```

**Переключение режимов**:
```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.2 }}
>
  {mode === 'simple' ? <SimpleModeForm /> : <CustomModeForm />}
</motion.div>
```

---

## 🎯 Метрики успеха

### До рефакторинга:
- ❌ Один большой компонент (442 строки)
- ❌ Нет разделения Simple/Custom
- ❌ Boost Style не интегрирован в V2
- ❌ Lyrics не подставляется автоматически

### После рефакторинга v1.0:
- ✅ Двухрежимная форма
- ✅ Boost Style интегрирован
- ✅ Lyrics автоподстановка
- ✅ Логирование всех действий
- ⚠️ Все еще один файл (617 строк)

### Цели v2.0:
- ✅ Модульная структура (компоненты внутри файла)
- ✅ Tags carousel для быстрого добавления
- ✅ Collapsible секции
- ✅ Lyrics variant selector
- ✅ Zod валидация
- ✅ Анимации и transitions
- 📊 Размер файла: ~400 строк основной логики

---

## 📝 Рекомендации по разработке

### 1. Не создавать новые файлы
- Все компоненты внутри MusicGeneratorV2.tsx
- Использовать `memo()` для оптимизации
- Типы в начале файла

### 2. Хирургические изменения
- Изменять только необходимое
- Не трогать работающий функционал
- Добавлять, а не переписывать

### 3. Тестирование после каждого этапа
- Проверить Simple mode
- Проверить Custom mode
- Проверить Boost Style
- Проверить Lyrics Generation
- Проверить Audio upload

### 4. Логирование
- Использовать `logger.info()` для успешных действий
- Использовать `logger.error()` для ошибок
- Добавлять контекст в логи

---

## 🚀 Готово к внедрению

Текущая версия готова к использованию:
- ✅ Двухрежимная форма работает
- ✅ Boost Style интегрирован
- ✅ Lyrics автогенерация + автопереключение
- ✅ Все функции сохранены
- ✅ Дизайн не изменен кардинально

**Следующий шаг**: Phase 2 (Tags Carousel + Collapsible) по запросу пользователя.
