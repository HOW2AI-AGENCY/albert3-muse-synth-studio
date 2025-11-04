# 🗺️ Дорожная карта реализации доработок

**Дата создания**: 4 ноября 2025
**Версия**: 1.0.0
**Базовый документ**: [COMPREHENSIVE_AUDIT_2025-11-04.md](./audit/COMPREHENSIVE_AUDIT_2025-11-04.md)

---

## 📅 Обзор спринтов

| Спринт | Длительность | Фокус | Приоритет |
|--------|--------------|-------|-----------|
| Sprint 33 | 3 дня | Критичные баги (P0) | 🔴 Высокий |
| Sprint 34 | 5 дней | UI/UX генератора | ⚠️ Средний |
| Sprint 35 | 3 дня | Интеграции и провайдеры | ⚠️ Средний |
| Sprint 36 | 3 дня | Лента треков и карточки | 📋 Средний |
| Sprint 37 | 4 дня | Дизайн-система | 📋 Низкий |
| Sprint 38 | 5 дней | Мобильная оптимизация | ⚠️ Средний |
| Sprint 39 | 3 дня | Тестирование и документация | 📋 Низкий |

**Общая продолжительность**: 26 рабочих дней (5-6 недель)

---

## 🔴 Sprint 33: Критичные баги (3 дня)

**Цель**: Устранить блокирующие проблемы, влияющие на работу пользователей

### День 1: Исследование и подготовка

#### Задача 1.1: Аудит logger импортов
- [ ] Запустить grep поиск дублирующихся импортов:
  ```bash
  grep -rn "import.*logger.*from.*logger" src/ --include="*.ts" --include="*.tsx"
  ```
- [ ] Создать список файлов с проблемой
- [ ] Исправить все найденные дублирования
- [ ] Запустить TypeScript проверку: `npx tsc --noEmit`

**Критерий выполнения**: 0 дублирующихся logger импортов

#### Задача 1.2: Исследование бага версий треков
- [ ] Прочитать `src/hooks/useTrackVersions.ts`
- [ ] Проверить SQL запросы в `useTracks.ts`
- [ ] Проверить компонент `TrackVersions.tsx`
- [ ] Найти место фильтрации версий
- [ ] Создать тестовый трек с множественными версиями
- [ ] Воспроизвести баг

**Критерий выполнения**: Найдена root cause проблемы

#### Задача 1.3: Исследование Node.js версии
- [ ] Проверить текущую версию: `node --version`
- [ ] Проверить требования Vite 7.1.12
- [ ] Проверить требования Vitest 4.0.6
- [ ] Принять решение: обновить Node или downgrade зависимости

**Критерий выполнения**: Документирован план действий

### День 2: Исправление критичных багов

#### Задача 2.1: Исправить баг версий треков

**Предположительное решение**:
```typescript
// src/hooks/useTrackVersions.ts

export const useTrackVersions = (trackId: string) => {
  // БЫЛО:
  const versions = track.track_versions?.filter(v => v.is_primary_variant);

  // ДОЛЖНО БЫТЬ:
  const versions = track.track_versions?.filter(v => v.audio_url !== null);

  const masterVersion = versions?.find(v => v.is_primary_variant);
  const preferredVersion = versions?.find(v => v.is_preferred_variant);

  return {
    allVersions: versions || [],
    masterVersion,
    preferredVersion,
    versionCount: versions?.length || 0
  };
};
```

**Задачи**:
- [ ] Исправить фильтрацию в `useTrackVersions.ts`
- [ ] Обновить `TrackCard` для отображения всех версий
- [ ] Добавить version selector в UI
- [ ] Создать unit тест
- [ ] Протестировать вручную с 3+ версиями

**Критерий выполнения**: Все версии отображаются и переключаются

#### Задача 2.2: Исправить storage path для референсов

**Файлы**:
- `src/components/generator/hooks/useAudioUploadHandler.ts`
- `src/components/generator/MusicGeneratorContainer.tsx`
- `supabase/migrations/` - новая миграция

**Действия**:
1. **Обновить схему БД**:
```sql
-- Новая миграция
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS reference_storage_path TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS reference_url_expires_at TIMESTAMPTZ;

-- Индекс для очистки истекших URL
CREATE INDEX IF NOT EXISTS idx_tracks_reference_url_expires_at
ON tracks(reference_url_expires_at) WHERE reference_url_expires_at IS NOT NULL;
```

2. **Обновить frontend логику**:
```typescript
// При загрузке файла сохранять path
const handleAudioUpload = async (file: File) => {
  const path = `audio/${userId}/${Date.now()}_${file.name}`;

  await supabase.storage.from('audio').upload(path, file);

  const { data } = await supabase.storage
    .from('audio')
    .createSignedUrl(path, 3600); // 1 час

  state.setParams({
    referenceStoragePath: path,
    referenceAudioUrl: data.signedUrl,
    referenceUrlExpiresAt: new Date(Date.now() + 3600 * 1000)
  });
};

// При использовании референса проверять срок
const getValidReferenceUrl = async (storagePath: string) => {
  const { data } = await supabase.storage
    .from('audio')
    .createSignedUrl(storagePath, 3600);

  return data.signedUrl;
};
```

**Задачи**:
- [ ] Создать миграцию БД
- [ ] Обновить TypeScript типы
- [ ] Обновить useAudioUploadHandler
- [ ] Обновить генерацию (использовать storage path)
- [ ] Добавить background job для refresh истекших URL
- [ ] Протестировать с истечением URL

**Критерий выполнения**: Референс работает через 1+ час после загрузки

### День 3: Node.js и финальные исправления

#### Задача 3.1: Обновить Node.js или зависимости

**Вариант A: Обновить Node.js** (рекомендуется):
```bash
# Используя nvm
nvm install 20
nvm use 20
npm install
```

**Вариант B: Downgrade зависимости**:
```json
// package.json
{
  "devDependencies": {
    "vite": "^6.0.0",    // Совместим с Node 18
    "vitest": "^3.0.0"   // Совместим с Node 18
  }
}
```

**Задачи**:
- [ ] Выбрать вариант
- [ ] Выполнить изменения
- [ ] Проверить сборку: `npm run build`
- [ ] Проверить тесты: `npm test`
- [ ] Обновить CI/CD для использования Node 20

**Критерий выполнения**: Сборка и тесты проходят без ошибок

#### Задача 3.2: Проверка и коммит

- [ ] Запустить все проверки:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm test`
- [ ] Протестировать вручную:
  - Генерация музыки с референсом
  - Отображение версий треков
  - Переключение между версиями
- [ ] Создать PR с исправлениями
- [ ] Code review
- [ ] Merge в main

**Критерий выполнения**: Все P0 баги исправлены и задеплоены

---

## ⚠️ Sprint 34: UI/UX генератора (5 дней)

**Цель**: Улучшить пользовательский опыт формы генерации

### День 1-2: Индикация режимов и подстановка данных

#### Задача 4.1: Улучшить переключатель режимов

**Файл**: `src/components/generator/CompactHeader.tsx`

```tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sparkles, Settings } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

<ToggleGroup
  type="single"
  value={mode}
  onValueChange={onModeChange}
  className="w-full h-11"
>
  <ToggleGroupItem value="simple" className="flex-1 gap-2">
    <Sparkles className="h-4 w-4" />
    <span>Простой</span>
    <InfoTooltip>
      Минимум настроек, быстрый старт
    </InfoTooltip>
  </ToggleGroupItem>

  <ToggleGroupItem value="custom" className="flex-1 gap-2">
    <Settings className="h-4 w-4" />
    <span>Расширенный</span>
    <InfoTooltip>
      Полный контроль, все параметры
    </InfoTooltip>
  </ToggleGroupItem>
</ToggleGroup>
```

**Задачи**:
- [ ] Обновить CompactHeader.tsx
- [ ] Добавить иконки
- [ ] Добавить InfoTooltip компонент (если нет)
- [ ] Добавить анимацию перехода
- [ ] Протестировать на мобильных (touch targets 44px+)

#### Задача 4.2: Preview выбранных элементов

**Файл**: `src/components/generator/QuickActionsBar.tsx`

```tsx
<div className="flex flex-wrap gap-2">
  {/* Референс аудио */}
  {hasAudio && referenceDetails && (
    <Card className="p-2 text-xs flex items-center gap-2">
      <Music className="h-4 w-4 text-primary" />
      <div>
        <div className="font-medium">{referenceDetails.fileName}</div>
        <div className="text-muted-foreground">
          {formatDuration(referenceDetails.duration)}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onRemoveReference}
      >
        <X className="h-3 w-3" />
      </Button>
    </Card>
  )}

  {/* Персона */}
  {hasPersona && personaDetails && (
    <Card className="p-2 text-xs flex items-center gap-2">
      <User className="h-4 w-4 text-primary" />
      <div>
        <div className="font-medium">{personaDetails.name}</div>
        <div className="text-muted-foreground line-clamp-1">
          {personaDetails.description}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onRemovePersona}>
        <X className="h-3 w-3" />
      </Button>
    </Card>
  )}

  {/* Проект */}
  {hasProject && projectDetails && (
    <Card className="p-2 text-xs flex items-center gap-2">
      <Folder className="h-4 w-4 text-primary" />
      <div>
        <div className="font-medium">{projectDetails.name}</div>
        <div className="flex gap-1 mt-0.5">
          {projectDetails.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="h-4 text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onRemoveProject}>
        <X className="h-3 w-3" />
      </Button>
    </Card>
  )}
</div>
```

**Задачи**:
- [ ] Создать хуки для загрузки деталей:
  - `useReferenceDetails(url)`
  - `usePersonaDetails(id)`
  - `useProjectDetails(id)`
- [ ] Обновить QuickActionsBar с preview
- [ ] Добавить кнопки удаления
- [ ] Адаптировать для мобильных (vertical stack)

#### Задача 4.3: Подстановка данных проекта

**Файл**: `src/components/generator/MusicGeneratorContainer.tsx`

```typescript
const handleProjectSelect = useCallback(async (projectId: string | null) => {
  if (!projectId) {
    state.setParam('activeProjectId', null);
    return;
  }

  // Загрузить детали проекта
  const { data: project } = await supabase
    .from('music_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) return;

  // Показать диалог подтверждения
  const confirmed = await confirm({
    title: 'Применить настройки проекта?',
    description: `Загрузить теги и параметры проекта "${project.name}"?`,
    confirmText: 'Применить',
    cancelText: 'Только привязать'
  });

  if (confirmed) {
    state.setParams(prev => ({
      ...prev,
      activeProjectId: projectId,
      prompt: prev.prompt || project.description,
      style_tags: [
        ...prev.style_tags,
        ...(project.tags || [])
      ].filter((tag, index, arr) => arr.indexOf(tag) === index) // unique
    }));
  } else {
    state.setParam('activeProjectId', projectId);
  }

  setProjectDialogOpen(false);
}, [state]);
```

**Задачи**:
- [ ] Создать confirm dialog компонент
- [ ] Обновить handleProjectSelect
- [ ] Добавить логику smart merge тегов
- [ ] Добавить индикацию "загружено из проекта"
- [ ] Unit тесты для merge логики

### День 3-4: Рефакторинг состояния генератора

#### Задача 4.4: Разделить состояние на контексты

**Структура**:
```
src/contexts/generator/
├── GenerationParamsContext.tsx
├── UIStateContext.tsx
├── EnhancedPromptContext.tsx
└── index.ts
```

**GenerationParamsContext.tsx**:
```typescript
interface GenerationParams {
  prompt: string;
  lyrics: string;
  style_tags: string[];
  modelVersion: string;
  provider: MusicProvider;
  personaId: string | null;
  referenceAudioUrl: string | null;
  referenceStoragePath: string | null;
  activeProjectId: string | null;
  // ... остальные параметры
}

interface GenerationParamsContextType {
  params: GenerationParams;
  setParam: <K extends keyof GenerationParams>(
    key: K,
    value: GenerationParams[K]
  ) => void;
  setParams: (updater: (prev: GenerationParams) => GenerationParams) => void;
  resetParams: () => void;
}

export const GenerationParamsProvider = ({ children }) => {
  const [params, setParamsState] = useState<GenerationParams>(defaultParams);

  const setParam = useCallback(<K extends keyof GenerationParams>(
    key: K,
    value: GenerationParams[K]
  ) => {
    setParamsState(prev => ({ ...prev, [key]: value }));
  }, []);

  // ... остальная логика

  return (
    <GenerationParamsContext.Provider value={{ params, setParam, setParams, resetParams }}>
      {children}
    </GenerationParamsContext.Provider>
  );
};
```

**UIStateContext.tsx**:
```typescript
interface UIState {
  mode: 'simple' | 'custom';
  audioSourceDialogOpen: boolean;
  personaDialogOpen: boolean;
  projectDialogOpen: boolean;
  lyricsDialogOpen: boolean;
  historyDialogOpen: boolean;
  audioPreviewOpen: boolean;
}

// ... аналогично
```

**EnhancedPromptContext.tsx**:
```typescript
interface EnhancedPromptState {
  enhancedPrompt: string | null;
  isEnhancing: boolean;
  error: Error | null;
}

interface EnhancedPromptContextType extends EnhancedPromptState {
  enhance: (prompt: string) => Promise<void>;
  accept: (finalPrompt: string) => void;
  reject: () => void;
  reset: () => void;
}

// ... аналогично
```

**Задачи**:
- [ ] Создать GenerationParamsContext
- [ ] Создать UIStateContext
- [ ] Создать EnhancedPromptContext
- [ ] Обновить MusicGeneratorContainer для использования контекстов
- [ ] Обновить все дочерние компоненты
- [ ] Удалить старый useGeneratorState (или сделать wrapper)
- [ ] Unit тесты для контекстов

#### Задача 4.5: Упростить MusicGeneratorContainer

После разделения на контексты, MusicGeneratorContainer должен стать тоньше:

```typescript
const MusicGeneratorContainerComponent = ({ onTrackGenerated }) => {
  const { params, setParam, setParams } = useGenerationParams();
  const { mode, setMode, dialogs, setDialog } = useUIState();
  const { enhancedPrompt, enhance, accept, reject } = useEnhancedPrompt();

  // Основная логика генерации
  const { generate, isGenerating } = useGenerateMusic({
    provider: params.provider,
    onSuccess: onTrackGenerated
  });

  // Обработчики
  const handleGenerate = async () => {
    await generate(params);
  };

  // ... остальное

  return (
    <MusicGeneratorContent
      params={params}
      mode={mode}
      dialogs={dialogs}
      enhancedPrompt={enhancedPrompt}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
      // ...
    />
  );
};
```

**Задачи**:
- [ ] Упростить MusicGeneratorContainer
- [ ] Удалить дублирующийся код
- [ ] Улучшить читаемость
- [ ] Code review

### День 5: QuickActionsBar и финализация

#### Задача 4.6: Адаптивный QuickActionsBar

**Файл**: `src/components/generator/QuickActionsBar.tsx`

```tsx
<div className={cn(
  'flex gap-2',
  isMobile ? 'flex-col' : 'flex-row flex-wrap'
)}>
  {/* Показать только активные на мобильных */}
  {(!isMobile || hasAudio) && (
    <Button
      variant={hasAudio ? 'default' : 'outline'}
      onClick={onAudioClick}
      className={cn(isMobile && 'w-full justify-start')}
    >
      <Music className="h-4 w-4 mr-2" />
      {hasAudio ? 'Изменить референс' : 'Добавить референс'}
    </Button>
  )}

  {(!isMobile || hasPersona) && (
    <Button
      variant={hasPersona ? 'default' : 'outline'}
      onClick={onPersonaClick}
      className={cn(isMobile && 'w-full justify-start')}
    >
      <User className="h-4 w-4 mr-2" />
      {hasPersona ? 'Изменить персону' : 'Выбрать персону'}
    </Button>
  )}

  {/* ... остальные */}

  {/* Кнопка "Показать все" на мобильных */}
  {isMobile && !showAll && (
    <Button
      variant="ghost"
      onClick={() => setShowAll(true)}
      className="w-full"
    >
      Показать все действия
    </Button>
  )}
</div>
```

**Задачи**:
- [ ] Адаптивный layout (vertical/horizontal)
- [ ] Скрывать неактивные на мобильных
- [ ] Кнопка "Показать все"
- [ ] Анимации появления/скрытия
- [ ] Touch-friendly (44px высота)

#### Задача 4.7: Тестирование и документация

- [ ] Unit тесты для новых компонентов
- [ ] Integration тесты для generation flow
- [ ] Обновить UI_SPEC.md
- [ ] Добавить screenshots в документацию
- [ ] Code review и merge

**Критерий выполнения Sprint 34**: UI генератора интуитивно понятен, данные подставляются корректно

---

## ⚠️ Sprint 35: Интеграции и провайдеры (3 дня)

**Цель**: Улучшить надежность интеграций с AI провайдерами

### День 1: Capabilities система

#### Задача 5.1: Добавить capabilities в провайдеры

**Файл**: `src/services/providers/base.ts`

```typescript
export interface ProviderCapabilities {
  referenceAudio: boolean;
  personas: boolean;
  customLyrics: boolean;
  instrumental: boolean;
  stems: boolean;
  extend: boolean;
  cover: boolean;
  models: string[];
}

export interface IProviderClient {
  capabilities: ProviderCapabilities;

  generateMusic(params: GenerationParams): Promise<GenerationResult>;
  checkHealth(): Promise<boolean>;
  getRemainingCredits(): Promise<number>;
}
```

**Suno Adapter**:
```typescript
export class SunoProviderAdapter implements IProviderClient {
  capabilities: ProviderCapabilities = {
    referenceAudio: true,
    personas: true,
    customLyrics: true,
    instrumental: true,
    stems: true,
    extend: true,
    cover: true,
    models: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V5']
  };

  // ...
}
```

**Mureka Adapter**:
```typescript
export class MurekaProviderAdapter implements IProviderClient {
  capabilities: ProviderCapabilities = {
    referenceAudio: false,  // ❌
    personas: false,         // ❌
    customLyrics: true,
    instrumental: true,
    stems: false,            // ❌
    extend: true,
    cover: false,            // ❌
    models: ['default']
  };

  // ...
}
```

**Задачи**:
- [ ] Добавить ProviderCapabilities интерфейс
- [ ] Обновить IProviderClient
- [ ] Реализовать capabilities в Suno adapter
- [ ] Реализовать capabilities в Mureka adapter
- [ ] Unit тесты для capabilities

#### Задача 5.2: UI для capabilities

**Компонент**: `ProviderCapabilitiesBadges.tsx`

```tsx
<div className="flex flex-wrap gap-1">
  <Badge variant={capabilities.referenceAudio ? 'default' : 'secondary'}>
    <Music className="h-3 w-3 mr-1" />
    Референс аудио
  </Badge>

  <Badge variant={capabilities.personas ? 'default' : 'secondary'}>
    <User className="h-3 w-3 mr-1" />
    Персоны
  </Badge>

  {/* ... остальные */}
</div>
```

**Использование в CompactHeader**:
```tsx
<ProviderSelector value={provider} onChange={onProviderChange}>
  <ProviderOption value="suno">
    <div className="flex items-center justify-between w-full">
      <span>Suno AI</span>
      <ProviderCapabilitiesBadges provider="suno" compact />
    </div>
  </ProviderOption>

  <ProviderOption value="mureka">
    <div className="flex items-center justify-between w-full">
      <span>Mureka</span>
      <ProviderCapabilitiesBadges provider="mureka" compact />
    </div>
  </ProviderOption>
</ProviderSelector>
```

**Задачи**:
- [ ] Создать ProviderCapabilitiesBadges компонент
- [ ] Интегрировать в ProviderSelector
- [ ] Добавить tooltip с описанием каждой capability
- [ ] Протестировать на мобильных

### День 2: Health check и fallback

#### Задача 5.3: Реализовать health check

**Файл**: `src/services/providers/adapters/suno.adapter.ts`

```typescript
export class SunoProviderAdapter implements IProviderClient {
  async checkHealth(): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('get-balance', {
        body: { provider: 'suno' }
      });

      if (response.error) throw response.error;

      return response.data?.status === 'ok';
    } catch (error) {
      logger.error('Suno health check failed', error as Error, 'SunoAdapter');
      return false;
    }
  }

  async getRemainingCredits(): Promise<number> {
    const response = await supabase.functions.invoke('get-balance', {
      body: { provider: 'suno' }
    });

    return response.data?.balance || 0;
  }
}
```

**Задачи**:
- [ ] Реализовать checkHealth в Suno adapter
- [ ] Реализовать checkHealth в Mureka adapter
- [ ] Реализовать getRemainingCredits
- [ ] Добавить Edge Function health check endpoint
- [ ] Unit тесты

#### Задача 5.4: Автоматический fallback

**Файл**: `src/hooks/useGenerateMusic.ts`

```typescript
const generateWithFallback = async (params: GenerationParams) => {
  const primaryProvider = params.provider;
  const primaryAdapter = ProviderFactory.getProvider(primaryProvider);

  // Попытка с основным провайдером
  try {
    logger.info('Attempting generation with primary provider', 'useGenerateMusic', {
      provider: primaryProvider
    });

    return await primaryAdapter.generateMusic(params);
  } catch (error) {
    logger.error('Primary provider failed', error as Error, 'useGenerateMusic', {
      provider: primaryProvider
    });

    // Проверить fallback провайдеры
    const fallbackProviders = ProviderFactory.getSupportedProviders()
      .filter(p => p !== primaryProvider);

    for (const fallbackProvider of fallbackProviders) {
      try {
        const fallbackAdapter = ProviderFactory.getProvider(fallbackProvider);

        // Проверить health
        const isHealthy = await fallbackAdapter.checkHealth();
        if (!isHealthy) continue;

        // Адаптировать параметры к capabilities
        const adaptedParams = adaptParamsToCapabilities(
          params,
          fallbackAdapter.capabilities
        );

        logger.info('Falling back to alternative provider', 'useGenerateMusic', {
          provider: fallbackProvider,
          removedParams: Object.keys(params).filter(
            key => !(key in adaptedParams)
          )
        });

        // Уведомить пользователя
        toast({
          title: `Переключение на ${fallbackProvider}`,
          description: `${primaryProvider} недоступен. Некоторые параметры могут быть изменены.`,
          variant: 'warning'
        });

        return await fallbackAdapter.generateMusic(adaptedParams);
      } catch (fallbackError) {
        logger.error('Fallback provider failed', fallbackError as Error, 'useGenerateMusic', {
          provider: fallbackProvider
        });
        continue;
      }
    }

    // Если все провайдеры failed
    throw new Error('All providers unavailable');
  }
};

const adaptParamsToCapabilities = (
  params: GenerationParams,
  capabilities: ProviderCapabilities
): GenerationParams => {
  const adapted = { ...params };

  if (!capabilities.referenceAudio) {
    delete adapted.referenceAudioUrl;
    delete adapted.referenceStoragePath;
  }

  if (!capabilities.personas) {
    delete adapted.personaId;
  }

  return adapted;
};
```

**Задачи**:
- [ ] Реализовать generateWithFallback
- [ ] Реализовать adaptParamsToCapabilities
- [ ] Добавить уведомления пользователя
- [ ] Integration тесты для fallback flow
- [ ] Документировать в SUNO_API_INTEGRATION.md

### День 3: Replicate оптимизация и real-time баланс

#### Задача 5.5: Кеширование анализа Replicate

**Новая таблица**:
```sql
CREATE TABLE audio_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash TEXT UNIQUE NOT NULL,
  analysis_result JSONB NOT NULL,
  provider TEXT NOT NULL, -- 'replicate', 'essentia', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_audio_analysis_cache_hash ON audio_analysis_cache(file_hash);
CREATE INDEX idx_audio_analysis_cache_expires ON audio_analysis_cache(expires_at);
```

**Edge Function**: `analyze-audio-cached/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { createReplicateClient } from '../_shared/replicate.ts';
import { logger } from '../_shared/logger.ts';
import crypto from 'crypto';

serve(async (req) => {
  const { audioUrl } = await req.json();

  // 1. Скачать аудио и вычислить hash
  const audioResponse = await fetch(audioUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  const hash = crypto.createHash('sha256').update(new Uint8Array(audioBuffer)).digest('hex');

  // 2. Проверить кеш
  const { data: cached } = await supabase
    .from('audio_analysis_cache')
    .select('*')
    .eq('file_hash', hash)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    logger.info('Using cached analysis', { hash });
    return new Response(JSON.stringify(cached.analysis_result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Выполнить анализ
  const replicate = createReplicateClient({ apiKey: REPLICATE_API_KEY });
  const result = await replicate.run(MODEL_VERSION, { audio: audioUrl });

  // 4. Сохранить в кеш
  await supabase.from('audio_analysis_cache').insert({
    file_hash: hash,
    analysis_result: result,
    provider: 'replicate'
  });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Задачи**:
- [ ] Создать таблицу audio_analysis_cache
- [ ] Создать Edge Function analyze-audio-cached
- [ ] Обновить frontend для использования кеша
- [ ] Добавить cleanup job для истекших записей
- [ ] Протестировать с повторным анализом

#### Задача 5.6: Real-time баланс провайдеров

**Компонент**: `ProviderBalanceIndicator.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ProviderBalanceIndicator = ({ provider }: { provider: MusicProvider }) => {
  const { data: balance, isLoading } = useQuery({
    queryKey: ['provider-balance', provider],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('get-balance', {
        body: { provider }
      });
      return data?.balance || 0;
    },
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    enabled: !!provider
  });

  if (isLoading) return <Skeleton className="h-4 w-20" />;

  const isLow = balance !== undefined && balance < 10;

  return (
    <div className={cn(
      'flex items-center gap-1 text-xs',
      isLow && 'text-warning'
    )}>
      <Coins className="h-3 w-3" />
      <span>{balance} кредитов</span>
      {isLow && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>
              Баланс заканчивается. Пополните аккаунт.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
```

**Использование**:
```tsx
<CompactHeader>
  {/* ... */}
  <ProviderBalanceIndicator provider={selectedProvider} />
</CompactHeader>
```

**Задачи**:
- [ ] Создать ProviderBalanceIndicator компонент
- [ ] Интегрировать в CompactHeader
- [ ] Добавить предупреждение при низком балансе
- [ ] Добавить ссылку на пополнение
- [ ] Протестировать с разными балансами

**Критерий выполнения Sprint 35**: Интеграции надежны, есть fallback, баланс отображается

---

## 📋 Sprint 36: Лента треков и карточки (3 дня)

**Цель**: Улучшить отображение и управление треками

### День 1: Infinite scroll

#### Задача 6.1: Интегрировать infinite scroll

**Файл**: `src/components/TracksList.tsx`

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

const TracksListComponent = ({ ... }) => {
  const { ref: loadMoreRef, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['tracks', userId, projectId],
    queryFn: ({ pageParam = 0 }) => fetchTracksPage({ pageParam }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: 0
  });

  const allTracks = data?.pages.flatMap(page => page.tracks) || [];

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <VirtualizedTrackGrid tracks={allTracks} />

      {/* Loader для следующей страницы */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && <LoadingSpinner />}
        {!hasNextPage && allTracks.length > 0 && (
          <div className="text-center text-muted-foreground">
            Все треки загружены
          </div>
        )}
      </div>
    </>
  );
};
```

**Задачи**:
- [ ] Установить react-intersection-observer
- [ ] Обновить TracksList для infinite scroll
- [ ] Добавить loading состояние
- [ ] Добавить "end of list" индикатор
- [ ] Протестировать с 100+ треками

### День 2: Мобильная версия TrackCard

#### Задача 6.2: Использовать TrackCardMobile

**Файл**: `src/features/tracks/components/TrackCardWrapper.tsx`

```tsx
import { TrackCard } from './TrackCard';
import { TrackCardMobile } from './TrackCardMobile';
import { useBreakpoints } from '@/hooks/useBreakpoints';

export const TrackCardWrapper = (props: TrackCardProps) => {
  const { isMobile } = useBreakpoints();

  return isMobile
    ? <TrackCardMobile {...props} />
    : <TrackCard {...props} />;
};
```

**Обновить TrackCardMobile**:
```tsx
<Card className="relative overflow-hidden">
  {/* Swipeable actions */}
  <SwipeableActions
    left={<LikeAction />}
    right={<DeleteAction />}
  />

  <div className="p-3">
    {/* Обложка */}
    <div className="flex gap-3">
      <TrackCardCover
        src={track.cover_url}
        alt={track.title}
        className="w-16 h-16 rounded"
      />

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{track.title}</h3>
        <p className="text-xs text-muted-foreground">{track.artist}</p>
      </div>
    </div>

    {/* Основные действия */}
    <div className="flex gap-2 mt-3">
      <Button size="sm" className="flex-1" onClick={handlePlay}>
        <Play className="h-4 w-4 mr-2" />
        Играть
      </Button>

      <Button size="sm" variant="outline" onClick={handleLike}>
        <Heart className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDownload(track.id)}>
            <Download className="h-4 w-4 mr-2" />
            Скачать
          </DropdownMenuItem>
          {/* ... остальные действия */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</Card>
```

**Swipeable Actions**:
```tsx
import { useSwipeable } from 'react-swipeable';

export const SwipeableActions = ({ left, right, children }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setSwipeOffset(eventData.deltaX);
    },
    onSwipedLeft: () => {
      if (Math.abs(swipeOffset) > 100) {
        // Trigger left action
      }
      setSwipeOffset(0);
    },
    onSwipedRight: () => {
      if (Math.abs(swipeOffset) > 100) {
        // Trigger right action
      }
      setSwipeOffset(0);
    }
  });

  return (
    <div className="relative" {...handlers}>
      {/* Left action (показывается при свайпе вправо) */}
      <div
        className="absolute inset-y-0 left-0 flex items-center px-4 bg-green-500"
        style={{ width: Math.max(0, swipeOffset) }}
      >
        {left}
      </div>

      {/* Right action (показывается при свайпе влево) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center px-4 bg-red-500"
        style={{ width: Math.max(0, -swipeOffset) }}
      >
        {right}
      </div>

      {/* Content */}
      <div style={{ transform: `translateX(${swipeOffset}px)` }}>
        {children}
      </div>
    </div>
  );
};
```

**Задачи**:
- [ ] Создать TrackCardWrapper
- [ ] Обновить TrackCardMobile
- [ ] Реализовать SwipeableActions
- [ ] Увеличить touch targets (44px+)
- [ ] Haptic feedback при swipe
- [ ] Протестировать на реальных устройствах

### День 3: Track Operations улучшения

#### Задача 6.3: Soft delete с корзиной

**Миграция**:
```sql
-- Добавить поле deleted_at
ALTER TABLE tracks ADD COLUMN deleted_at TIMESTAMPTZ;

-- Индекс для активных треков
CREATE INDEX idx_tracks_active
ON tracks(user_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Индекс для корзины
CREATE INDEX idx_tracks_deleted
ON tracks(user_id, deleted_at DESC)
WHERE deleted_at IS NOT NULL;
```

**Обновить useTracks**:
```typescript
const { data } = useInfiniteQuery({
  queryKey: ['tracks', userId, { includeDeleted }],
  queryFn: ({ pageParam }) => fetchTracks({
    userId,
    includeDeleted,
    pageParam
  })
});

const fetchTracks = async ({ userId, includeDeleted, pageParam }) => {
  let query = supabase
    .from('tracks')
    .select('*')
    .eq('user_id', userId);

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // ...
};
```

**Soft delete операция**:
```typescript
const deleteTrack = async (trackId: string) => {
  await supabase
    .from('tracks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', trackId);

  toast({
    title: 'Трек удален',
    description: 'Трек перемещен в корзину',
    action: (
      <Button size="sm" onClick={() => restoreTrack(trackId)}>
        Отменить
      </Button>
    ),
    duration: 5000
  });
};

const restoreTrack = async (trackId: string) => {
  await supabase
    .from('tracks')
    .update({ deleted_at: null })
    .eq('id', trackId);

  toast({
    title: 'Трек восстановлен',
    description: 'Трек возвращен из корзины'
  });
};
```

**Страница корзины**:
```tsx
// src/pages/workspace/Trash.tsx
export const Trash = () => {
  const { tracks } = useTracks(0, { includeDeleted: true });

  const deletedTracks = tracks.filter(t => t.deleted_at !== null);

  return (
    <div>
      <h1>Корзина</h1>

      {deletedTracks.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Корзина пуста"
          description="Удаленные треки появятся здесь"
        />
      ) : (
        <>
          <TracksList
            tracks={deletedTracks}
            showRestoreAction
          />

          <Button onClick={emptyTrash} variant="destructive">
            Очистить корзину
          </Button>
        </>
      )}
    </div>
  );
};
```

**Задачи**:
- [ ] Создать миграцию для deleted_at
- [ ] Обновить useTracks для soft delete
- [ ] Реализовать deleteTrack и restoreTrack
- [ ] Создать страницу Trash
- [ ] Добавить в навигацию
- [ ] Добавить auto-cleanup после 30 дней
- [ ] Unit тесты для soft delete

**Критерий выполнения Sprint 36**: Infinite scroll работает, TrackCard мобилен, корзина реализована

---

## 📋 Sprint 37-39: Дизайн-система, Мобильная оптимизация, Тестирование

*(Детальный план для этих спринтов создается аналогично)*

---

## 📊 Метрики успеха

### Технические метрики:

- ✅ 0 критичных багов (P0)
- ✅ < 5 высокоприоритетных багов (P1)
- ✅ Test coverage > 70% для критичного кода
- ✅ Lighthouse Score > 90 (Performance, Accessibility)
- ✅ Bundle size < 500KB (gzipped)
- ✅ Time to Interactive < 3s

### UX метрики:

- ✅ Mobile usability score > 90
- ✅ Touch targets >= 44px (WCAG AAA)
- ✅ Время генерации трека: понятный feedback
- ✅ Версии треков: интуитивное переключение
- ✅ Нет confusion при переключении провайдеров

### Business метрики:

- ✅ Снижение rate limit ошибок на 80%
- ✅ Увеличение успешных генераций на 20%
- ✅ Снижение расхода API кредитов на 30% (кеширование)
- ✅ Уменьшение времени на генерацию (fallback)

---

## 🎯 Управление рисками

### Риск 1: Затягивание рефакторинга

**Вероятность**: Средняя
**Воздействие**: Высокое
**Митигация**:
- Time-boxing для каждой задачи
- Не начинать новый рефакторинг пока не закончен текущий
- Code review после каждого большого изменения

### Риск 2: Breaking changes в API провайдеров

**Вероятность**: Низкая
**Воздействие**: Высокое
**Митигация**:
- Comprehensive error handling
- Version pinning в API клиентах
- Monitoring для API errors

### Риск 3: Регрессии в существующем функционале

**Вероятность**: Средняя
**Воздействие**: Среднее
**Митигация**:
- Automated regression tests
- Manual QA checklist перед каждым релизом
- Feature flags для новых фич

---

## 📝 Чеклист перед началом спринта

- [ ] Все stakeholders согласны с планом
- [ ] Приоритеты задач согласованы
- [ ] Resources (developers) назначены
- [ ] Development environment настроен
- [ ] Доступ к Suno/Mureka API проверен
- [ ] Supabase credentials актуальны
- [ ] CI/CD pipeline работает

---

## 🚀 Чеклист перед релизом

- [ ] Все задачи спринта completed
- [ ] Unit tests проходят
- [ ] Integration tests проходят
- [ ] E2E tests проходят
- [ ] Manual QA checklist пройден
- [ ] Performance benchmarks в норме
- [ ] Security scan пройден
- [ ] Documentation обновлена
- [ ] Changelog обновлен
- [ ] Rollback plan готов
- [ ] Stakeholders уведомлены

---

**Конец дорожной карты**

*Этот документ будет обновляться по мере прогресса работ.*
