# 🎛️ План оптимизации и вынос настроек в админ-панель

## 📋 Текущее состояние

Проект имеет базовую структуру админ-панели (`/workspace/monitoring`), но большинство настроек захардкожены в коде.

## 🎯 Цели оптимизации

1. **Централизация конфигурации** - вынос всех настроек в БД
2. **UI для управления** - интерфейс в админ-панели
3. **Улучшение архитектуры** - применение best practices

---

## 📊 Этап 1: Аудит настроек для выноса

### 1.1 Провайдеры музыки (Music Providers)

**Текущее расположение:**
- `src/config/provider-models.ts`
- `src/services/providers/registry.ts`

**Настройки для выноса:**
```typescript
// Таблица: app_settings
{
  "music_providers": {
    "suno": {
      "enabled": true,
      "default_model": "V5",
      "models": ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"],
      "rate_limit": 10,
      "timeout": 30000
    },
    "mureka": {
      "enabled": true,
      "default_model": "mureka-o1",
      "models": ["mureka-6", "mureka-7.5", "mureka-o1"],
      "rate_limit": 10
    }
  }
}
```

**UI компонент:**
- `src/components/admin/settings/MusicProvidersConfig.tsx`
- Переключатели enable/disable
- Выбор default модели
- Настройка rate limits

---

### 1.2 Музыкальные стили (Music Styles)

**Текущее расположение:**
- `src/data/music-styles/`
- ~300 стилей захардкожены

**Настройки для выноса:**
```sql
CREATE TABLE music_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- electronic, rock, jazz, etc.
  description TEXT,
  tags TEXT[],
  popularity INTEGER DEFAULT 5, -- 1-10
  related_styles TEXT[],
  tempo_range JSONB, -- { min: 80, max: 140 }
  moods TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI компонент:**
- `src/components/admin/music-styles/MusicStylesManager.tsx`
- CRUD операции для стилей
- Категоризация
- Импорт/экспорт CSV

---

### 1.3 Лимиты генерации (Generation Limits)

**Текущее расположение:**
- `src/hooks/useGenerationLimits.ts` (захардкожены планы)

**Настройки для выноса:**
```sql
-- Таблица уже существует: subscription_plans
-- Добавить UI для редактирования

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS
  settings JSONB DEFAULT '{}'::jsonb;

-- Пример settings:
{
  "concurrent_generations": 3,
  "quality_presets": ["low", "medium", "high"],
  "features": {
    "stem_separation": true,
    "extend_track": true,
    "cover_creation": true
  }
}
```

**UI компонент:**
- `src/components/admin/subscriptions/SubscriptionPlansEditor.tsx`
- Визуальный редактор планов
- Настройка лимитов и фич

---

### 1.4 UI/UX настройки (Theme & Layout)

**Текущее расположение:**
- `src/index.css` (дизайн-токены)
- `tailwind.config.ts`

**Настройки для выноса:**
```typescript
// Таблица: app_settings
{
  "theme": {
    "primary_color": "hsl(262.1 83.3% 57.8%)",
    "accent_color": "hsl(220 14.3% 95.9%)",
    "border_radius": "0.5rem",
    "animation_speed": "300ms"
  },
  "layout": {
    "sidebar_width": "280px",
    "header_height": "64px",
    "enable_animations": true
  }
}
```

**UI компонент:**
- `src/components/admin/theme/ThemeCustomizer.tsx`
- Color picker для цветов
- Preview изменений в реальном времени

---

### 1.5 Персоны (Personas)

**Текущее расположение:**
- Таблица: `suno_personas`
- UI: `src/components/generator/ui/PersonaSelector.tsx`

**Улучшения:**
- Добавить дефолтные персоны в app_settings
- Категоризация персон
- Пресеты персон для проектов

**UI компонент:**
- `src/components/admin/personas/PersonasManager.tsx`
- CRUD персон
- Импорт из Suno
- Организация по категориям

---

### 1.6 Prompt Templates (Шаблоны промптов)

**Текущее расположение:**
- Частично в `project_prompts`
- Большинство захардкожены

**Настройки для выноса:**
```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- genre, mood, style
  template TEXT NOT NULL,
  variables JSONB, -- { "tempo": "number", "mood": "string" }
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI компонент:**
- `src/components/admin/prompts/PromptTemplatesManager.tsx`
- Создание шаблонов с переменными
- Тестирование промптов

---

## 🏗️ Этап 2: Архитектурные улучшения

### 2.1 Централизованный Config Service

```typescript
// src/services/config.service.ts
export class ConfigService {
  private static cache = new Map<string, any>();
  
  static async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    this.cache.set(key, data?.value);
    return data?.value;
  }
  
  static async set(key: string, value: any): Promise<void> {
    await supabase.from('app_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    });
    
    this.cache.set(key, value);
  }
  
  static clearCache() {
    this.cache.clear();
  }
}
```

### 2.2 React Query для settings

```typescript
// src/hooks/useAppSettings.ts
export const useAppSettings = (key: string) => {
  return useQuery({
    queryKey: ['app_settings', key],
    queryFn: () => ConfigService.get(key),
    staleTime: 5 * 60 * 1000 // 5 минут
  });
};

export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => 
      ConfigService.set(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries(['app_settings', key]);
    }
  });
};
```

---

## 🎨 Этап 3: UI Админ-панели

### 3.1 Структура AdminPanel

```
src/components/admin/
├── AdminPanel.tsx              # Главный контейнер
├── settings/
│   ├── MusicProvidersConfig.tsx
│   ├── GenerationLimitsConfig.tsx
│   └── SystemSettings.tsx
├── music-styles/
│   ├── MusicStylesManager.tsx
│   ├── StyleEditor.tsx
│   └── StyleImporter.tsx
├── personas/
│   ├── PersonasManager.tsx
│   └── PersonaEditor.tsx
├── prompts/
│   ├── PromptTemplatesManager.tsx
│   └── TemplateEditor.tsx
└── theme/
    ├── ThemeCustomizer.tsx
    └── ColorPicker.tsx
```

### 3.2 Главный компонент

```typescript
// src/components/admin/AdminPanel.tsx
export const AdminPanel = () => {
  return (
    <Tabs defaultValue="providers">
      <TabsList>
        <TabsTrigger value="providers">Провайдеры</TabsTrigger>
        <TabsTrigger value="styles">Стили музыки</TabsTrigger>
        <TabsTrigger value="personas">Персоны</TabsTrigger>
        <TabsTrigger value="prompts">Шаблоны промптов</TabsTrigger>
        <TabsTrigger value="limits">Лимиты</TabsTrigger>
        <TabsTrigger value="theme">Тема</TabsTrigger>
      </TabsList>
      
      <TabsContent value="providers">
        <MusicProvidersConfig />
      </TabsContent>
      
      {/* ... остальные табы */}
    </Tabs>
  );
};
```

---

## 🚀 Этап 4: План внедрения

### Приоритет 1 (Неделя 1-2)
- [ ] Создать таблицу `app_settings`
- [ ] Реализовать `ConfigService`
- [ ] Вынести провайдеры музыки в БД
- [ ] UI для управления провайдерами

### Приоритет 2 (Неделя 3-4)
- [ ] Создать таблицу `music_styles`
- [ ] Миграция текущих стилей в БД
- [ ] UI для управления стилями
- [ ] Импорт/экспорт функционал

### Приоритет 3 (Неделя 5-6)
- [ ] Вынести лимиты генерации
- [ ] UI для управления subscription plans
- [ ] Создать таблицу `prompt_templates`
- [ ] UI для шаблонов промптов

### Приоритет 4 (Неделя 7-8)
- [ ] Система управления персонами
- [ ] Категоризация и теги
- [ ] Theme customizer
- [ ] Preview изменений

---

## 📈 Метрики успеха

1. **Снижение hardcoded values** на 80%+
2. **Время настройки** < 5 минут (vs текущие 30+ минут редактирования кода)
3. **Admin panel coverage** - 90%+ настроек доступны через UI
4. **Response time** - конфиг загружается < 100ms (с кешем)

---

## 🛡️ Best Practices применяемые

1. **Single Source of Truth** - все настройки в БД
2. **Separation of Concerns** - config, business logic, UI разделены
3. **Caching Strategy** - React Query + in-memory cache
4. **Type Safety** - TypeScript для всех settings
5. **Version Control** - история изменений настроек
6. **Rollback Support** - возможность откатить изменения
7. **Environment-based** - разные настройки для dev/prod

---

## 🔧 Технические детали

### Database Schema
```sql
-- Таблица уже существует
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Новые таблицы
CREATE TABLE music_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  popularity INTEGER DEFAULT 5,
  related_styles TEXT[],
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 Заметки для разработчиков

- **Кеширование критично** - без кеша будет слишком много запросов к БД
- **Валидация обязательна** - некорректные настройки могут сломать приложение
- **Audit log** - логировать все изменения настроек (кто, когда, что)
- **Fallback values** - если настройка не найдена, использовать дефолтные значения
- **Testing** - unit тесты для ConfigService, E2E для админ-панели
