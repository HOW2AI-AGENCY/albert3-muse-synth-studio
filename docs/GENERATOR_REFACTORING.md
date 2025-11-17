# Generator Refactoring - Модульная структура

**Status:** ✅ COMPLETED  
**Date:** 2025-11-17  
**Type:** Component Restructuring

---

## 🎯 Проблема

Форма генерации музыки (`MusicGeneratorContent.tsx`) имела:
- **47+ пропсов** - сложная сигнатура компонента
- **Дублирующие компоненты** - повторяющаяся логика
- **Низкая переиспользуемость** - сложно добавлять новые секции
- **Большой размер файла** - 260+ строк монолитного кода

## ✅ Решение

Создана модульная система секций генератора:

### Новая структура

```
src/components/generator/sections/
├── GeneratorSection.tsx     # Базовая обертка секции
├── PromptSection.tsx        # Промпт с AI улучшением
├── StyleSection.tsx         # Теги и стили
├── LyricsSection.tsx        # Лирика с генерацией
├── AdvancedSection.tsx      # Расширенные настройки
└── index.ts                 # Exports
```

---

## 📦 Компоненты

### 1. GeneratorSection (Base)

**Назначение:** Универсальная обертка для секций

**Props:**
```typescript
interface GeneratorSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}
```

**Особенности:**
- Опциональный заголовок и описание
- Слот для действий в header
- Консистентный spacing

---

### 2. PromptSection

**Назначение:** Ввод и улучшение промпта

**Props:**
```typescript
interface PromptSectionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isEnhancing?: boolean;
  onBoost?: () => void;
  disabled?: boolean;
}
```

**Функции:**
- ✅ Textarea для промпта
- ✅ Кнопка AI улучшения
- ✅ Счетчик символов (лимит 500)
- ✅ Предупреждение при приближении к лимиту

**Использование:**
```tsx
<PromptSection
  value={params.prompt}
  onChange={(value) => setParams({ ...params, prompt: value })}
  onBoost={handleBoostPrompt}
  isEnhancing={isEnhancing}
/>
```

---

### 3. StyleSection

**Назначение:** Управление тегами стилей

**Props:**
```typescript
interface StyleSectionProps {
  tags: string;
  onChange: (tags: string) => void;
  disabled?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}
```

**Функции:**
- ✅ Input для тегов (через запятую)
- ✅ Визуализация текущих тегов в Badge
- ✅ Удаление тегов по клику на X
- ✅ Популярные теги-подсказки
- ✅ Предотвращение дублей

**Использование:**
```tsx
<StyleSection
  tags={params.tags}
  onChange={(tags) => setParams({ ...params, tags })}
  suggestions={['pop', 'rock', 'electronic', 'ambient']}
  onSuggestionClick={(tag) => {
    const newTags = params.tags ? `${params.tags}, ${tag}` : tag;
    setParams({ ...params, tags: newTags });
  }}
/>
```

---

### 4. LyricsSection

**Назначение:** Ввод и генерация лирики

**Props:**
```typescript
interface LyricsSectionProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onGenerate?: () => void;
  onOpen?: () => void;
  isGenerating?: boolean;
}
```

**Функции:**
- ✅ Textarea с моноширинным шрифтом
- ✅ Кнопка генерации лирики
- ✅ Кнопка открытия редактора
- ✅ Счетчик строк и символов
- ✅ Предупреждение при превышении 2000 символов

**Использование:**
```tsx
<LyricsSection
  value={params.lyrics}
  onChange={(value) => setParams({ ...params, lyrics: value })}
  onGenerate={() => setLyricsDialogOpen(true)}
  onOpen={() => setLyricsEditorOpen(true)}
  isGenerating={isGeneratingLyrics}
/>
```

---

### 5. AdvancedSection

**Назначение:** Расширенные параметры генерации

**Props:**
```typescript
interface AdvancedSectionProps {
  modelVersion: string;
  onModelChange: (model: string) => void;
  vocalGender: string;
  onVocalGenderChange: (gender: string) => void;
  instrumental: boolean;
  onInstrumentalChange: (instrumental: boolean) => void;
  audioWeight?: number;
  onAudioWeightChange?: (weight: number) => void;
  styleWeight?: number;
  onStyleWeightChange?: (weight: number) => void;
  disabled?: boolean;
  availableModels?: Array<{ value: string; label: string; badge?: string }>;
}
```

**Функции:**
- ✅ Выбор модели генерации с badge (NEW, PRO)
- ✅ Toggle инструментальной версии
- ✅ Выбор типа вокала (male/female/any)
- ✅ Slider влияния стиля (0-100%)
- ✅ Slider влияния референса (0-100%)
- ✅ Tooltips с пояснениями

**Использование:**
```tsx
<AdvancedSection
  modelVersion={params.modelVersion}
  onModelChange={(model) => setParams({ ...params, modelVersion: model })}
  vocalGender={params.vocalGender}
  onVocalGenderChange={(gender) => setParams({ ...params, vocalGender: gender })}
  instrumental={params.makeInstrumental}
  onInstrumentalChange={(inst) => setParams({ ...params, makeInstrumental: inst })}
  styleWeight={params.styleWeight}
  onStyleWeightChange={(weight) => setParams({ ...params, styleWeight: weight })}
  availableModels={[
    { value: 'v3.5', label: 'Suno V3.5', badge: 'FAST' },
    { value: 'v4', label: 'Suno V4', badge: 'BALANCED' },
    { value: 'v5', label: 'Suno V5', badge: 'NEW' },
  ]}
/>
```

---

## 🎨 Преимущества новой архитектуры

### До рефакторинга:
```tsx
// MusicGeneratorContent.tsx - 47 пропсов
<MusicGeneratorContent
  state={state}
  isMobile={isMobile}
  isGenerating={isGenerating}
  isEnhancing={isEnhancing}
  currentModels={currentModels}
  audioSourceDialogOpen={audioSourceDialogOpen}
  personaDialogOpen={personaDialogOpen}
  projectDialogOpen={projectDialogOpen}
  onAudioSourceDialogOpenChange={onAudioSourceDialogOpenChange}
  // ... еще 38 пропсов
/>
```

### После рефакторинга:
```tsx
// Композиция из модульных секций
<ScrollArea>
  <PromptSection
    value={params.prompt}
    onChange={handlePromptChange}
    onBoost={handleBoost}
  />
  
  <StyleSection
    tags={params.tags}
    onChange={handleTagsChange}
    suggestions={popularTags}
  />
  
  <LyricsSection
    value={params.lyrics}
    onChange={handleLyricsChange}
    onGenerate={handleGenerateLyrics}
  />
  
  <AdvancedSection
    modelVersion={params.model}
    onModelChange={handleModelChange}
    {...advancedProps}
  />
</ScrollArea>
```

---

## 📊 Метрики улучшения

| Метрика | До | После | Улучшение |
|---------|-----|--------|-----------|
| **Props в MusicGeneratorContent** | 47 | 15 | -68% |
| **Размер файла MusicGeneratorContent** | 260 строк | ~120 строк | -54% |
| **Переиспользуемость** | Низкая | Высокая | ✅ |
| **Тестируемость** | Сложная | Простая | ✅ |
| **Добавление новых секций** | 50+ строк | 10 строк | ✅ |

---

## 🔄 Миграция

### Старый код:
```tsx
<div className="space-y-4">
  <Label>Промпт</Label>
  <Textarea
    value={params.prompt}
    onChange={(e) => setParam('prompt', e.target.value)}
    placeholder="..."
  />
  <Button onClick={handleBoost}>Улучшить</Button>
</div>
```

### Новый код:
```tsx
<PromptSection
  value={params.prompt}
  onChange={(value) => setParam('prompt', value)}
  onBoost={handleBoost}
/>
```

---

## 🚀 Дальнейшее развитие

### Планируемые секции:
- [ ] **ReferenceSection** - загрузка референсного аудио
- [ ] **ProjectSection** - выбор проекта и трека
- [ ] **PersonaSection** - выбор AI персоны
- [ ] **ScheduleSection** - отложенная генерация
- [ ] **BatchSection** - массовая генерация

### Улучшения:
- [ ] Drag & drop для изменения порядка секций
- [ ] Сохранение пресетов конфигурации
- [ ] Экспорт/импорт настроек
- [ ] A/B тестирование вариантов

---

## 📝 Best Practices

### 1. Композиция вместо наследования
```tsx
// ✅ GOOD: Композиция секций
<GeneratorForm>
  <PromptSection {...promptProps} />
  <StyleSection {...styleProps} />
  <LyricsSection {...lyricsProps} />
</GeneratorForm>

// ❌ BAD: Монолитный компонент
<GeneratorForm allProps={...} />
```

### 2. Единая ответственность
```tsx
// ✅ GOOD: Каждая секция отвечает за свою область
<PromptSection /> // Только промпт
<StyleSection />  // Только стили

// ❌ BAD: Смешанная логика
<PromptAndStyleSection /> // Делает слишком много
```

### 3. Минимальные пропсы
```tsx
// ✅ GOOD: Только необходимые пропсы
<PromptSection
  value={value}
  onChange={onChange}
/>

// ❌ BAD: Избыточные пропсы
<PromptSection
  value={value}
  onChange={onChange}
  isEnhancing={false}
  onBoost={undefined}
  disabled={false}
  // ... избыточные опциональные пропсы
/>
```

---

## 🐛 Известные ограничения

1. **Зависимость от GeneratorSection** - все секции используют базовую обертку
2. **Нет валидации пропсов** - TypeScript проверяет типы, но не логику
3. **Отсутствие unit-тестов** - нужно добавить тесты для каждой секции

---

## 📚 Связанные документы

- [Week 6 Advanced Performance](./WEEK_6_ADVANCED_PERFORMANCE.md)
- [Repository Map](./REPOSITORY_MAP.md)
- [Component Guidelines](../README.md#component-guidelines)

---

**Last Updated:** 2025-11-17  
**Status:** ✅ COMPLETED  
**Next Review:** 2025-11-24
