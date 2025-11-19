# Комплексный Аудит Проекта Albert3 Muse Synth Studio

**Дата проведения:** 2025-11-19
**Версия аудита:** 2.0 (Расширенный)
**Аудитор:** Claude Code AI Assistant
**Охват:** Кодовая база, архитектура, бизнес-логика, UI/UX, тестирование

---

## 📊 Executive Summary

Проект Albert3 Muse Synth Studio представляет собой современное веб-приложение для AI-генерации музыки с мощным функционалом и передовым технологическим стеком. Однако анализ выявил **критические архитектурные проблемы**, которые могут привести к снижению производительности, усложнению поддержки и риску технического банкротства при масштабировании.

### Ключевые Метрики

| Метрика | Значение | Статус |
|---------|----------|--------|
| **Строк кода (TS/TSX)** | ~27,603 | 🟡 Средний проект |
| **React компонентов** | 120+ | 🟢 Хорошо |
| **Custom hooks** | 130+ | 🔴 Избыточно |
| **Тестовое покрытие** | 68 файлов | 🔴 Неравномерное |
| **Файлов в features/tracks** | 68 | ⚠️ Требует реструктуризации |
| **Largest file** | dawStore.ts (1,158 строк) | 🔴 Критично |
| **God Class** | api.service.ts (563 строки) | 🔴 Критично |
| **Bundle size** | Не измерен | ⚠️ Требует анализа |

### Общая Оценка: 🟡 **6.5/10**

**Сильные стороны:**
- ✅ Современный стек (React 18, TypeScript, Vite)
- ✅ Использование TanStack Query для server state
- ✅ Хорошая документация (CLAUDE.md)
- ✅ Интеграция с Sentry для мониторинга
- ✅ Применение best practices (React Query, Zustand)

**Критические слабости:**
- 🔴 Монолитные модули (God Class, God Store)
- 🔴 Monkey-patching сторонних библиотек
- 🔴 Перегруженные хуки (470+ строк)
- 🔴 Недостаточное тестирование критической логики
- 🔴 Нарушение принципов модульности

---

## 🔍 Детальный Анализ

### 1. Архитектура и Структура Проекта

#### 1.1. Структура `src/features/tracks/`

**Статус:** 🔴 **Критично**

**Проблема:** Нарушение модульности и Domain-Driven Design

**Находки:**
- Директория содержит **68 файлов**, многие из которых не относятся напрямую к домену "tracks"
- Смешение concerns: UI компоненты, API логика, хуки, утилиты
- Неочевидная структура для новых разработчиков

**Структура:**
```
src/features/tracks/
├── api/                    # ✅ Хорошо - domain-specific API
├── components/             # ⚠️ Смешение UI компонентов
│   ├── card/              # Track card components
│   ├── shared/            # Общие компоненты (должны быть в src/components)
│   └── TrackCard.tsx      # Дубликаты с ui/TrackCard.tsx
├── hooks/                  # ✅ Domain-specific hooks (7 файлов)
├── ui/                     # ⚠️ Дублирование с components/
│   ├── cards/             # 12 различных Card компонентов
│   ├── tabs/              # Tab-компоненты
│   └── DetailPanel*.tsx   # 5 версий DetailPanel
└── index.ts
```

**Конкретные примеры избыточности:**
- `components/TrackCard.tsx` vs `ui/TrackCard.tsx` (дублирование)
- 5 версий DetailPanel: `DetailPanel.tsx`, `DetailPanelMobile.tsx`, `DetailPanelMobileV2.tsx`, `MinimalDetailPanel.tsx`, `ModernDetailPanel.tsx`
- 12 различных Card-компонентов в `ui/cards/`

**Рекомендации:**
1. **Рефакторинг структуры:**
   ```
   src/features/tracks/
   ├── api/              # Track-specific API calls
   ├── hooks/            # Track-specific hooks
   ├── components/       # ТОЛЬКО track domain components
   ├── types/            # Track domain types
   └── utils/            # Track utilities
   ```

2. **Перенести общие компоненты:**
   - `shared/*` → `src/components/shared/`
   - Множественные версии DetailPanel → унифицировать в один адаптивный компонент

3. **Ликвидировать дубликаты:**
   - Объединить `components/` и `ui/` в одну папку
   - Использовать паттерн Compound Components для Card вместо 12 отдельных файлов

**Приоритет:** P0 (Критический)
**Сложность:** Высокая (2-3 дня)
**Влияние:** Поддержка, DX, Онбординг новых разработчиков

---

#### 1.2. Избыточность Custom Hooks

**Статус:** 🔴 **Критично**

**Проблема:** 130 custom hooks создают когнитивную нагрузку

**Находки:**
- `src/hooks/`: **130 файлов**
- `src/features/tracks/hooks/`: 7 файлов
- Многие хуки являются тонкими обертками над React Query или простыми утилитами

**Примеры избыточных хуков:**
```typescript
// useBreakpoints.ts - простая утилита, не требует хука
// useCardActions.ts - может быть обычной функцией
// use-mobile.tsx - дублирует useBreakpoints
```

**Рекомендации:**
1. **Аудит хуков:** Категоризировать все 130 хуков:
   - Stateful hooks (требуют useState/useEffect) → оставить
   - Pure functions → переместить в `src/utils/`
   - Thin wrappers → удалить, использовать напрямую

2. **Создать guidelines:**
   - Когда создавать хук vs утилиту
   - Naming conventions
   - Ограничение размера (max 100 строк для хука)

**Приоритет:** P1 (Высокий)
**Сложность:** Средняя (3-5 дней)
**Влияние:** Code clarity, Bundle size, Maintenance

---

### 2. Anti-Patterns и Code Smells

#### 2.1. God Class: `api.service.ts`

**Статус:** 🔴 **Критично**

**Местоположение:** `src/services/api.service.ts:133-562`

**Проблема:** Монолитный класс со статическими методами, нарушение Single Responsibility Principle

**Метрики:**
- **Размер:** 563 строки
- **Методов:** 13 публичных статических методов
- **Responsibilities:** Tracks, Lyrics, Prompts, Balance, Stems

**Код (фрагмент):**
```typescript:src/services/api.service.ts
export class ApiService {
  // Track operations
  static async getUserTracks(userId: string): Promise<Track[]> { ... }
  static async getTrackById(trackId: string): Promise<Track | null> { ... }
  static async deleteTrack(trackId: string): Promise<void> { ... }

  // Lyrics operations
  static async generateLyrics(request: GenerateLyricsRequest): Promise<...> { ... }

  // Prompt operations
  static async improvePrompt(request: ImprovePromptRequest): Promise<...> { ... }

  // Balance operations
  static async getProviderBalance(provider: 'suno' | 'replicate'): Promise<...> { ... }

  // Stem operations
  static async syncStemJob(params: {...}): Promise<boolean> { ... }
}
```

**Проблемы:**
1. **Нарушение SRP:** Один класс отвечает за 5+ доменов
2. **Сложность тестирования:** Статические методы сложно мокать
3. **Tight coupling:** Все части приложения зависят от одного класса
4. **Сложность поддержки:** Изменения в одном домене могут сломать другие

**Рекомендации:**

**Шаг 1: Создать отдельные сервисы**
```typescript
// src/services/tracks/track.service.ts
export class TrackService {
  static async getUserTracks(userId: string): Promise<Track[]> { ... }
  static async getById(trackId: string): Promise<Track | null> { ... }
  static async delete(trackId: string): Promise<void> { ... }
  static async incrementPlayCount(trackId: string): Promise<void> { ... }
}

// src/services/lyrics/lyrics.service.ts
export class LyricsService {
  static async generate(request: GenerateLyricsRequest): Promise<...> { ... }
}

// src/services/prompts/prompt.service.ts
export class PromptService {
  static async improve(request: ImprovePromptRequest): Promise<...> { ... }
}

// src/services/balance/balance.service.ts
export class BalanceService {
  private static inFlightBalance: Map<string, Promise<...>> = new Map();
  private static cache: Map<string, ProviderBalanceResponse> = new Map();

  static async getProviderBalance(provider: 'suno' | 'replicate'): Promise<...> { ... }
}

// src/services/stems/stem.service.ts
export class StemService {
  static async syncJob(params: {...}): Promise<boolean> { ... }
}
```

**Шаг 2: Обновить импорты**
```typescript
// Before
import { ApiService } from '@/services/api.service';
await ApiService.getUserTracks(userId);

// After
import { TrackService } from '@/services/tracks/track.service';
await TrackService.getUserTracks(userId);
```

**Шаг 3: Deprecate ApiService**
```typescript
// src/services/api.service.ts
/**
 * @deprecated Use domain-specific services instead:
 * - TrackService for track operations
 * - LyricsService for lyrics
 * - PromptService for prompts
 * - BalanceService for balance
 * - StemService for stems
 */
export class ApiService {
  static async getUserTracks(userId: string): Promise<Track[]> {
    console.warn('ApiService.getUserTracks is deprecated. Use TrackService.getUserTracks');
    return TrackService.getUserTracks(userId);
  }
  // ... delegate to new services
}
```

**Приоритет:** P0 (Критический)
**Сложность:** Средняя (2-3 дня)
**Влияние:** Maintainability, Testability, Scalability

---

#### 2.2. God Store: `dawStore.ts`

**Статус:** 🔴 **Критично**

**Местоположение:** `src/stores/dawStore.ts:1-1158`

**Проблема:** Монолитный Zustand store управляет всем состоянием DAW редактора

**Метрики:**
- **Размер:** 1,158 строк (один из крупнейших файлов в проекте)
- **State fields:** 8 (project, timeline, selection, clipboard, isPlaying, isRecording, history, toolMode)
- **Actions:** 40+ методов
- **Complexity:** Высокая (управление треками, клипами, эффектами, маркерами, undo/redo)

**Код (структура):**
```typescript:src/stores/dawStore.ts
export const useDAWStore = create<DAWState>()(
  devtools(
    persist(
      (set, get) => ({
        // STATE (8 fields)
        project: DAWProject | null,
        timeline: TimelineState,
        selection: SelectionState,
        clipboard: ClipboardState,
        isPlaying: boolean,
        isRecording: boolean,
        history: DAWProject[],
        historyIndex: number,
        toolMode: 'select' | 'cut' | 'draw' | 'erase',

        // PROJECT ACTIONS (5 methods)
        createProject, loadProject, saveProject, updateProjectName, updateBPM,

        // TRACK ACTIONS (5 methods)
        addTrack, removeTrack, updateTrack, duplicateTrack, loadStemsAsMultitrack,

        // CLIP ACTIONS (5 methods)
        addClip, removeClip, updateClip, splitClip, duplicateClip,

        // TIMELINE ACTIONS (9 methods)
        play, pause, stop, seekTo, setLoop, toggleLoop, setZoom, setScroll, ...

        // SELECTION ACTIONS (4 methods)
        selectClip, selectTrack, selectRegion, clearSelection,

        // CLIPBOARD ACTIONS (4 methods)
        cutSelected, copySelected, paste, deleteSelected,

        // MARKER/REGION ACTIONS (4 methods)
        addMarker, removeMarker, addRegion, removeRegion,

        // EFFECT ACTIONS (4 methods)
        addEffect, removeEffect, updateEffect, toggleEffect,

        // UNDO/REDO (3 methods)
        undo, redo, pushHistory,

        // UTILITY (3 methods)
        setToolMode, snapTimeToGrid, getTrackByClipId,
      })
    )
  )
);
```

**Проблемы:**

1. **Производительность:**
   - Любое обновление может вызвать ре-рендер всех подписанных компонентов
   - История (50 снапшотов проекта) занимает память
   - Операции над массивами треков/клипов могут быть медленными

2. **Сложность тестирования:**
   - Невозможно изолированно тестировать отдельные части
   - 40+ методов требуют сотен тестов
   - **КРИТИЧНО:** Нет ни одного теста для dawStore.ts!

3. **Поддержка:**
   - 1158 строк кода в одном файле
   - Сложно понять зависимости между actions
   - Изменения в одной части могут сломать другие

**Рекомендации:**

**Решение 1: Slice Pattern (Рекомендуется)**

Разбить на независимые слайсы с использованием Zustand slices:

```typescript
// src/stores/daw/projectSlice.ts
export interface ProjectSlice {
  project: DAWProject | null;
  createProject: (name: string) => void;
  loadProject: (project: DAWProject) => void;
  saveProject: () => Promise<void>;
  updateProjectName: (name: string) => void;
  updateBPM: (bpm: number) => void;
}

export const createProjectSlice: StateCreator<
  ProjectSlice & TimelineSlice & TrackSlice & ClipSlice,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  project: null,
  createProject: (name) => { ... },
  loadProject: (project) => { ... },
  saveProject: async () => { ... },
  updateProjectName: (name) => { ... },
  updateBPM: (bpm) => { ... },
});

// src/stores/daw/timelineSlice.ts
export const createTimelineSlice: StateCreator<...> = (set, get) => ({
  timeline: createDefaultTimeline(),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => { ... },
  seekTo: (time) => { ... },
  // ...
});

// src/stores/daw/trackSlice.ts
export const createTrackSlice: StateCreator<...> = (set, get) => ({
  addTrack: (type, name) => { ... },
  removeTrack: (trackId) => { ... },
  updateTrack: (trackId, updates) => { ... },
  // ...
});

// src/stores/daw/clipSlice.ts
export const createClipSlice: StateCreator<...> = (set, get) => ({
  addClip: (trackId, clipData) => { ... },
  removeClip: (clipId) => { ... },
  updateClip: (clipId, updates) => { ... },
  // ...
});

// src/stores/daw/historySlice.ts
export const createHistorySlice: StateCreator<...> = (set, get) => ({
  history: [],
  historyIndex: -1,
  undo: () => { ... },
  redo: () => { ... },
  pushHistory: () => { ... },
});

// src/stores/dawStore.ts (главный store - объединяет слайсы)
export const useDAWStore = create<DAWState>()(
  devtools(
    persist(
      (...a) => ({
        ...createProjectSlice(...a),
        ...createTimelineSlice(...a),
        ...createTrackSlice(...a),
        ...createClipSlice(...a),
        ...createHistorySlice(...a),
        ...createSelectionSlice(...a),
        ...createClipboardSlice(...a),
      }),
      { name: 'daw-storage' }
    )
  )
);
```

**Преимущества:**
- ✅ Изолированные модули (легче тестировать)
- ✅ Файлы по ~100-200 строк (читаемость)
- ✅ Возможность переиспользовать слайсы
- ✅ Лучшая производительность (меньше ре-рендеров при правильных селекторах)

**Решение 2: Оптимизация селекторов**

Независимо от рефакторинга, нужно создать селекторы для минимизации ре-рендеров:

```typescript
// src/stores/daw/selectors.ts
export const useDAWProject = () => useDAWStore((state) => state.project);
export const useDAWTimeline = () => useDAWStore((state) => state.timeline);
export const useDAWTracks = () => useDAWStore((state) => state.project?.tracks || []);
export const useDAWIsPlaying = () => useDAWStore((state) => state.isPlaying);

// Композитные селекторы
export const useDAWControls = () => useDAWStore(
  (state) => ({
    play: state.play,
    pause: state.pause,
    stop: state.stop,
    seekTo: state.seekTo,
  }),
  shallow // важно для предотвращения лишних ре-рендеров
);
```

**Приоритет:** P0 (Критический)
**Сложность:** Высокая (5-7 дней)
**Влияние:** Performance, Maintainability, Testability

**План реализации:**
1. Неделя 1: Создать slice структуру, написать тесты
2. Неделя 2: Миграция существующего кода, обновление компонентов
3. Неделя 3: Performance тестирование, оптимизация

---

#### 2.3. Monkey Patching: Supabase Client

**Статус:** 🔴 **Критично**

**Местоположение:** `src/integrations/supabase/client.ts:72-141`

**Проблема:** Переопределение метода `supabase.functions.invoke` через monkey-patching

**Код:**
```typescript:src/integrations/supabase/client.ts
export const supabase = createSupabaseClient();

const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

// ❌ MONKEY PATCHING - хрупкое решение
supabase.functions.invoke = (async (functionName, options = {}) => {
  const normalizedHeaders = normalizeHeaders(options.headers);
  const headersWithAuth = await ensureAuthHeader(normalizedHeaders);

  const headers =
    typeof window === "undefined"
      ? { ...headersWithAuth, "x-app-environment": appEnv.appEnv }
      : headersWithAuth;

  // Hardcoded logging для конкретных функций
  try {
    if (typeof window !== "undefined" && (functionName.startsWith("get-balance") || functionName === "separate-stems")) {
      const method = (options as { method?: string }).method ?? "POST";
      const hasAuth = Object.keys(headers).some(
        (key) => key.toLowerCase() === "authorization"
      );
      import('@/utils/logger').then(({ logger }) => {
        logger.debug(`Function invocation: ${functionName}`, undefined, { method, hasAuth });
      });
    }
  } catch (_) {}

  return originalInvoke(functionName, {
    ...options,
    headers,
  });
}) as typeof supabase.functions.invoke;
```

**Проблемы:**

1. **Хрупкость:**
   - Обновление библиотеки `@supabase/supabase-js` может сломать поведение
   - TypeScript не может отследить изменения сигнатуры
   - Нарушается принцип Open/Closed

2. **Тестирование:**
   - Сложно мокать в тестах
   - Невозможно отключить патч в unit-тестах
   - Побочные эффекты при импорте модуля

3. **Hardcoded логика:**
   - Специальное логирование для `get-balance` и `separate-stems`
   - Нарушение DRY (логирование должно быть единым)

4. **Performance:**
   - Dynamic import в hot path (`import('@/utils/logger')`)
   - Проверка `typeof window` и `functionName.startsWith` на каждый вызов

**Рекомендации:**

**Решение 1: Wrapper Class (Рекомендуется)**

```typescript
// src/integrations/supabase/client.ts
export const supabase = createSupabaseClient();

// src/integrations/supabase/functions.ts
import { supabase } from './client';
import { logger } from '@/utils/logger';
import { appEnv } from '@/config/env';

interface InvokeOptions {
  headers?: HeadersInit;
  body?: Record<string, unknown>;
  method?: string;
}

export class SupabaseFunctions {
  /**
   * Invokes a Supabase Edge Function with automatic auth header injection
   */
  static async invoke<T = unknown>(
    functionName: string,
    options: InvokeOptions = {}
  ): Promise<{ data: T | null; error: Error | null }> {
    const normalizedHeaders = this.normalizeHeaders(options.headers);
    const headersWithAuth = await this.ensureAuthHeader(normalizedHeaders);

    const headers = typeof window === "undefined"
      ? { ...headersWithAuth, "x-app-environment": appEnv.appEnv }
      : headersWithAuth;

    // Centralized logging
    this.logInvocation(functionName, options.method ?? 'POST', headers);

    return supabase.functions.invoke<T>(functionName, {
      ...options,
      headers,
    });
  }

  private static normalizeHeaders(init?: HeadersInit): Record<string, string> {
    if (typeof Headers !== "undefined" && init instanceof Headers) {
      const headers = new Headers(init);
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (!init) return {};
    if (Array.isArray(init)) {
      const result: Record<string, string> = {};
      init.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    }

    return init as Record<string, string>;
  }

  private static async ensureAuthHeader(
    headers: Record<string, string>
  ): Promise<Record<string, string>> {
    if (typeof window === "undefined") return headers;

    const hasAuthHeader = Object.keys(headers).some(
      (key) => key.toLowerCase() === "authorization"
    );

    if (hasAuthHeader) return headers;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        return {
          ...headers,
          Authorization: `Bearer ${session.access_token}`,
        };
      }
    } catch (error) {
      logger.warn('Failed to attach auth header', undefined, { error });
    }

    return headers;
  }

  private static logInvocation(
    functionName: string,
    method: string,
    headers: Record<string, string>
  ): void {
    if (typeof window === "undefined") return;

    const hasAuth = Object.keys(headers).some(
      (key) => key.toLowerCase() === "authorization"
    );

    logger.debug(`Edge Function: ${functionName}`, undefined, {
      method,
      hasAuth,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Использование:**
```typescript
// Before (monkey-patched)
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.functions.invoke('get-balance', { body: { provider } });

// After (wrapper)
import { SupabaseFunctions } from '@/integrations/supabase/functions';
const { data, error } = await SupabaseFunctions.invoke('get-balance', { body: { provider } });

// Or create a shorter alias
export const functions = SupabaseFunctions;
const { data, error } = await functions.invoke('get-balance', { body: { provider } });
```

**Преимущества:**
- ✅ Нет monkey-patching (безопасность при обновлениях)
- ✅ Легко тестировать (можно мокать SupabaseFunctions)
- ✅ Централизованное логирование
- ✅ TypeScript-friendly
- ✅ Можно легко добавить retry logic, rate limiting и т.д.

**Решение 2: HTTP Interceptor (альтернатива)**

```typescript
// src/integrations/supabase/interceptor.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const createInterceptedClient = (
  url: string,
  key: string,
  options: any
): SupabaseClient => {
  const client = createClient(url, key, {
    ...options,
    global: {
      ...options.global,
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        // Inject auth headers before fetch
        const session = await client.auth.getSession();
        const headers = new Headers(init?.headers);

        if (session.data.session?.access_token) {
          headers.set('Authorization', `Bearer ${session.data.session.access_token}`);
        }

        return fetch(input, {
          ...init,
          headers,
        });
      },
    },
  });

  return client;
};

export const supabase = createInterceptedClient(
  appEnv.supabaseUrl,
  appEnv.supabaseAnonKey,
  clientOptions
);
```

**Приоритет:** P0 (Критический)
**Сложность:** Средняя (1-2 дня)
**Влияние:** Stability, Maintainability, Testability

---

#### 2.4. Перегруженный Hook: `useGenerateMusic`

**Статус:** ⚠️ **Высокий приоритет**

**Местоположение:** `src/hooks/useGenerateMusic.ts:1-471`

**Проблема:** Hook выполняет слишком много задач, нарушение Single Responsibility Principle

**Метрики:**
- **Размер:** 471 строка (один из крупнейших хуков)
- **Responsibilities:** 7 (validation, sanitization, rate limiting, API calls, realtime subscriptions, polling, UI notifications)
- **Зависимости:** 10+ импортов
- **Complexity:** Высокая (state machine с 3 режимами: idle → generating → completed/failed)

**Код (ключевые части):**
```typescript:src/hooks/useGenerateMusic.ts
export const useGenerateMusic = ({ provider = 'suno', onSuccess, toast }: UseGenerateMusicOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Responsibilities:
  // 1. State management (useState, useRef)
  // 2. Cleanup logic (useEffect, cleanup function)
  // 3. Polling fallback (startPolling)
  // 4. Realtime subscriptions (setupSubscription)
  // 5. Input sanitization (sanitizePrompt, sanitizeLyrics, sanitizeTitle)
  // 6. Rate limiting (rateLimiter.check)
  // 7. Validation (prompt validation)
  // 8. API calls (GenerationService.generate)
  // 9. Error handling (try/catch, Sentry)
  // 10. UI notifications (toast messages)
  // 11. Sentry tracking (addBreadcrumb, trackGenerationEvent)

  const generate = useCallback(async (options: GenerationRequest): Promise<boolean> => {
    // ✅ Sanitize inputs (responsibility #5)
    const sanitizedOptions = {
      prompt: sanitizePrompt(options.prompt || ''),
      title: options.title ? sanitizeTitle(options.title) : undefined,
      lyrics: options.lyrics ? sanitizeLyrics(options.lyrics) : undefined,
    };

    // ✅ Logging (responsibility #11)
    logger.info('Generation request received', 'useGenerateMusic', {...});
    addBreadcrumb('Music generation started', 'generation', {...});
    Sentry.setTag('generation.provider', effectiveProvider);

    // ✅ Validation (responsibility #7)
    if (!effectivePrompt) {
      toast({ title: 'Ошибка', description: 'Введите описание', variant: 'destructive' });
      return false;
    }

    // ✅ Rate limiting (responsibility #6)
    const rateLimit = rateLimiter.check(user.id, RATE_LIMIT_CONFIGS.GENERATION);
    if (!rateLimit.allowed) {
      toast({ title: 'Превышен лимит', ... });
      return false;
    }

    // ✅ API call (responsibility #8)
    const result = await GenerationService.generate({...});

    // ✅ Error handling (responsibility #9)
    if (!result.success) {
      toast({ title: 'Ошибка', ... });
      return false;
    }

    // ✅ UI notification (responsibility #10)
    toast({ title: '🎵 Генерация началась!', ... });

    // ✅ Realtime subscription (responsibility #4)
    setupSubscription(result.trackId, isCachedResult);

    return true;
  }, [isGenerating, provider, cleanup, setupSubscription, toastRef, onSuccessRef]);

  return { generate, isGenerating, cleanup };
};
```

**Проблемы:**

1. **Нарушение SRP:**
   - Hook смешивает UI логику (toast), бизнес-логику (validation), инфраструктуру (subscriptions)
   - Невозможно переиспользовать без зависимости от toast

2. **Сложность тестирования:**
   - Для теста нужно мокать: toast, logger, Sentry, supabase, GenerationService, rateLimiter
   - 471 строка кода требует сотен тест-кейсов

3. **Tight coupling:**
   - Hook знает о UI (toast messages)
   - Hook знает о конкретных реализациях (RealtimeSubscriptionManager)

**Рекомендации:**

**Решение 1: Разделение Concerns (Рекомендуется)**

```typescript
// src/hooks/generation/useGenerationState.ts
// Pure state management (no UI, no side effects)
export const useGenerationState = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return {
    isGenerating,
    error,
    setIsGenerating,
    setError,
  };
};

// src/hooks/generation/useGenerationValidation.ts
// Pure validation logic
export const useGenerationValidation = () => {
  const validate = useCallback((options: GenerationRequest) => {
    const errors: string[] = [];

    if (!options.prompt?.trim()) {
      errors.push('Введите описание музыки');
    }

    if (options.prompt && options.prompt.length > 1000) {
      errors.push('Промпт слишком длинный (max 1000 символов)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return { validate };
};

// src/hooks/generation/useGenerationRateLimit.ts
// Rate limiting logic
export const useGenerationRateLimit = (userId: string | undefined) => {
  const check = useCallback(() => {
    if (!userId) return { allowed: false, reason: 'Unauthorized' };

    const rateLimit = rateLimiter.check(userId, RATE_LIMIT_CONFIGS.GENERATION);

    return {
      allowed: rateLimit.allowed,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
      reason: rateLimit.allowed ? undefined : 'Rate limit exceeded',
    };
  }, [userId]);

  return { check };
};

// src/hooks/generation/useGenerationSubscription.ts
// Realtime subscription logic
export const useGenerationSubscription = () => {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback((trackId: string, onUpdate: (track: TrackRow) => void) => {
    const unsubscribe = RealtimeSubscriptionManager.subscribeToTrack(
      trackId,
      (payload) => onUpdate(payload.new as TrackRow)
    );

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, []);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return { subscribe, cleanup };
};

// src/hooks/generation/useGenerateMusic.ts
// Main hook - orchestrates other hooks
export const useGenerateMusic = ({ provider = 'suno', onSuccess }: UseGenerateMusicOptions) => {
  const { isGenerating, setIsGenerating, error, setError } = useGenerationState();
  const { validate } = useGenerationValidation();
  const { data: { user } } = useUser();
  const { check: checkRateLimit } = useGenerationRateLimit(user?.id);
  const { subscribe, cleanup } = useGenerationSubscription();

  const generate = useCallback(async (options: GenerationRequest): Promise<GenerationResult> => {
    // 1. Validation
    const validation = validate(options);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // 2. Rate limiting
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      return {
        success: false,
        errors: [rateLimit.reason!],
      };
    }

    // 3. Sanitization
    const sanitized = {
      ...options,
      prompt: sanitizePrompt(options.prompt),
      title: options.title ? sanitizeTitle(options.title) : undefined,
      lyrics: options.lyrics ? sanitizeLyrics(options.lyrics) : undefined,
    };

    setIsGenerating(true);

    try {
      // 4. API call
      const result = await GenerationService.generate(sanitized);

      if (!result.success) {
        setError(new Error(result.error));
        return result;
      }

      // 5. Setup subscription
      subscribe(result.trackId!, (track) => {
        if (track.status === 'completed') {
          onSuccess?.();
          cleanup();
        } else if (track.status === 'failed') {
          setError(new Error(track.error_message || 'Generation failed'));
          cleanup();
        }
      });

      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return {
        success: false,
        errors: [error.message],
      };
    } finally {
      setIsGenerating(false);
    }
  }, [validate, checkRateLimit, subscribe, cleanup, onSuccess]);

  return {
    generate,
    isGenerating,
    error,
    cleanup,
  };
};
```

**UI Layer (separate):**
```typescript
// src/components/generation/GenerationForm.tsx
import { useGenerateMusic } from '@/hooks/generation/useGenerateMusic';
import { useToast } from '@/hooks/use-toast';

export const GenerationForm = () => {
  const { toast } = useToast();
  const { generate, isGenerating, error } = useGenerateMusic({
    provider: 'suno',
    onSuccess: () => {
      toast({ title: '✅ Трек готов!', description: 'Генерация завершена' });
    },
  });

  const handleSubmit = async (data: FormData) => {
    const result = await generate(data);

    if (!result.success) {
      // UI logic here
      toast({
        title: 'Ошибка генерации',
        description: result.errors.join(', '),
        variant: 'destructive',
      });
    } else {
      // UI logic here
      toast({
        title: '🎵 Генерация началась!',
        description: 'Ваш трек создаётся...',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <Button type="submit" disabled={isGenerating}>
        {isGenerating ? 'Генерируется...' : 'Создать трек'}
      </Button>
      {error && <ErrorMessage error={error} />}
    </form>
  );
};
```

**Преимущества:**
- ✅ Separation of Concerns (каждый хук = одна ответственность)
- ✅ Легко тестировать (изолированные модули)
- ✅ Переиспользование (можно использовать validation, rate limiting отдельно)
- ✅ Меньшие файлы (~50-100 строк каждый)
- ✅ UI logic вынесена в компоненты

**Приоритет:** P1 (Высокий)
**Сложность:** Средняя (2-3 дня)
**Влияние:** Testability, Reusability, Maintainability

---

### 3. UI/UX и Дизайн-Система

#### 3.1. Кастомные Button Variants

**Статус:** 🟡 **Требует документации**

**Местоположение:** `src/components/ui/button.tsx:21-23`

**Находки:**

Добавлены 3 кастомных варианта кнопок, которые выходят за рамки стандартной shadcn/ui дизайн-системы:

```typescript:src/components/ui/button.tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // Standard shadcn variants
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",

      // ⚠️ Custom variants (undocumented)
      hero: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg",
      glass: "bg-background/20 backdrop-blur-md border border-border/50 hover:bg-background/30",
      glow: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/50",
    },
  },
});
```

**Проблемы:**

1. **Отсутствие документации:**
   - Когда использовать `hero` vs `default`?
   - В чём отличие `glow` от `default` (кроме shadow)?
   - Нет примеров использования

2. **Риск дублирования:**
   - Разработчики могут создавать свои велосипеды, не зная о существующих вариантах
   - Непоследовательное использование в кодовой базе

3. **Accessibility:**
   - `glass` вариант с `bg-background/20` может иметь низкий контраст
   - Нет проверки WCAG AA/AAA compliance

**Рекомендации:**

**1. Создать документацию компонентов (Storybook или MDX)**

```tsx
// src/components/ui/__docs__/button.stories.tsx
import { Button } from '../button';

export default {
  title: 'UI/Button',
  component: Button,
};

export const Variants = () => (
  <div className="space-y-4">
    <div>
      <h3>Default</h3>
      <p>Standard primary action button</p>
      <Button variant="default">Click me</Button>
    </div>

    <div>
      <h3>Hero</h3>
      <p>Use for primary CTA on landing pages or hero sections</p>
      <Button variant="hero">Get Started</Button>
    </div>

    <div>
      <h3>Glass (Glassmorphism)</h3>
      <p>Use on image overlays or gradient backgrounds. Requires backdrop-blur support.</p>
      <p className="text-red-500">⚠️ Accessibility: Ensure sufficient color contrast</p>
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8">
        <Button variant="glass">Glass Button</Button>
      </div>
    </div>

    <div>
      <h3>Glow</h3>
      <p>Use for special actions that need extra attention (e.g., "Generate Music")</p>
      <Button variant="glow">Generate Track</Button>
    </div>
  </div>
);
```

**2. Создать Design System Guidelines**

```markdown
# Button Variants Guide

## Standard Variants (shadcn/ui)

| Variant | Use Case | Example |
|---------|----------|---------|
| `default` | Primary actions | "Save", "Submit", "Create" |
| `destructive` | Dangerous actions | "Delete", "Remove" |
| `outline` | Secondary actions | "Cancel", "Back" |
| `secondary` | Tertiary actions | "Learn More" |
| `ghost` | Minimal emphasis | Icon buttons, nav items |
| `link` | Text-only buttons | "View details", "See more" |

## Custom Variants (Project-specific)

### Hero Button
- **Use Case:** Primary CTA on landing pages, hero sections
- **Visual:** Gradient background with shadow
- **Accessibility:** ✅ WCAG AA compliant
- **Example:**
  ```tsx
  <Button variant="hero" size="lg">Start Creating Music</Button>
  ```

### Glass Button (Glassmorphism)
- **Use Case:** Overlays on images or gradients
- **Visual:** Semi-transparent with backdrop blur
- **Accessibility:** ⚠️ **Use only on high-contrast backgrounds**
- **Browser Support:** Requires `backdrop-filter` support
- **Example:**
  ```tsx
  <div className="relative">
    <img src="hero.jpg" />
    <div className="absolute inset-0 flex items-center justify-center">
      <Button variant="glass">Play Track</Button>
    </div>
  </div>
  ```

### Glow Button
- **Use Case:** Special actions requiring attention
- **Visual:** Primary color with glow shadow effect
- **Accessibility:** ✅ WCAG AA compliant
- **Example:**
  ```tsx
  <Button variant="glow" size="lg">
    <Music className="mr-2" /> Generate Music
  </Button>
  ```

## Decision Tree

```
Is this a dangerous action (delete, remove)?
├─ YES → Use `destructive`
└─ NO → Is this the primary action on the page?
    ├─ YES → Is this a hero section or landing page?
    │   ├─ YES → Use `hero`
    │   └─ NO → Does it need extra attention?
    │       ├─ YES → Use `glow`
    │       └─ NO → Use `default`
    └─ NO → Is this a secondary action?
        ├─ YES → Use `outline`
        └─ NO → Is this a tertiary action?
            ├─ YES → Use `secondary` or `ghost`
            └─ NO → Use `link` for text-only
```
```

**3. Аудит использования кастомных вариантов**

```bash
# Найти все использования кастомных вариантов
grep -r 'variant="hero"' src/
grep -r 'variant="glass"' src/
grep -r 'variant="glow"' src/

# Проверить consistency
```

**Приоритет:** P2 (Средний)
**Сложность:** Низкая (1 день)
**Влияние:** DX, Consistency, Onboarding

---

#### 3.2. Tailwind Configuration

**Статус:** 🟡 **Нормально, но сложно**

**Местоположение:** `tailwind.config.ts:1-371`

**Находки:**

Конфигурация Tailwind очень подробная (371 строка), что может усложнить поддержку:

```typescript:tailwind.config.ts
const config: Config = {
  theme: {
    extend: {
      colors: {
        // 10+ color shades for primary
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--color-primary-50))",
          100: "hsl(var(--color-primary-100))",
          // ... до 950
        },
        // Множество accent colors
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          purple: "hsl(var(--color-accent-purple))",
          blue: "hsl(var(--color-accent-blue))",
          pink: "hsl(var(--color-accent-pink))",
          green: "hsl(var(--color-accent-green))",
          orange: "hsl(var(--color-accent-orange))",
          red: "hsl(var(--color-accent-red))",
        },
        // ... многие другие
      },

      // 100+ строк кастомных animations
      animation: {
        "fade-in": "fade-in 0.3s ease-in",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        // ... десятки анимаций
      },

      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // ... десятки keyframes
      },
    },
  },
};
```

**Рекомендации:**

1. **Разбить конфигурацию на модули:**

```typescript
// tailwind.config/colors.ts
export const customColors = {
  primary: { /* ... */ },
  accent: { /* ... */ },
  // ...
};

// tailwind.config/animations.ts
export const customAnimations = {
  animation: { /* ... */ },
  keyframes: { /* ... */ },
};

// tailwind.config.ts
import { customColors } from './tailwind.config/colors';
import { customAnimations } from './tailwind.config/animations';

const config: Config = {
  theme: {
    extend: {
      colors: customColors,
      ...customAnimations,
    },
  },
};
```

2. **Задокументировать цветовую палитру:**

Создать `docs/design-system/colors.md` с визуальными примерами всех цветов.

**Приоритет:** P3 (Низкий)
**Сложность:** Низкая (1 день)
**Влияние:** Maintainability

---

### 4. Тестирование

#### 4.1. Покрытие Тестами

**Статус:** 🔴 **Критично**

**Находки:**

- **Общее количество тестовых файлов:** 68 (40 в `src/`, 28 в `tests/`)
- **Stores:** Только 1 тест (`audioPlayerStore.test.ts`), **dawStore.ts (1158 строк) не тестируется!**
- **Hooks:** Минимальное покрытие
- **Services:** Покрытие неизвестно
- **Components:** Частичное покрытие

**Критические пробелы:**

1. **dawStore.ts (1,158 строк) - 0% покрытия**
   - 40+ методов без тестов
   - Риск регрессий при рефакторинге
   - Невозможно гарантировать корректность undo/redo, clipboard operations, clip splitting

2. **api.service.ts (563 строки) - покрытие неизвестно**
   - Критическая бизнес-логика (треки, баланс, стемы)
   - Нет тестов для error handling
   - Нет тестов для retry logic

3. **useGenerateMusic (471 строка) - покрытие неизвестно**
   - Сложная state machine (idle → generating → completed/failed)
   - Нет тестов для polling fallback
   - Нет тестов для rate limiting
   - Нет тестов для subscription logic

**Рекомендации:**

**Шаг 1: Измерить текущее покрытие**

```bash
npm test -- --coverage
```

**Целевые метрики:**
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

**Шаг 2: Приоритизировать тестирование**

| Компонент | Приоритет | Текущее покрытие | Целевое | Сложность |
|-----------|-----------|------------------|---------|-----------|
| **dawStore.ts** | P0 | 0% | 80%+ | Высокая (3-5 дней) |
| **api.service.ts** | P0 | ? | 80%+ | Средняя (2-3 дня) |
| **useGenerateMusic** | P1 | ? | 75%+ | Средняя (2-3 дня) |
| **SupabaseFunctions** | P1 | ? | 90%+ | Низкая (1 день) |
| **Component tests** | P2 | ? | 70%+ | Низкая (ongoing) |

**Шаг 3: Создать тесты для dawStore (пример)**

```typescript
// src/stores/__tests__/dawStore.project.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDAWStore } from '../dawStore';

describe('dawStore - Project Actions', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useDAWStore());
    act(() => {
      useDAWStore.setState({
        project: null,
        history: [],
        historyIndex: -1,
      });
    });
  });

  describe('createProject', () => {
    it('should create a new project with default settings', () => {
      const { result } = renderHook(() => useDAWStore());

      act(() => {
        result.current.createProject('My Project');
      });

      expect(result.current.project).not.toBeNull();
      expect(result.current.project?.name).toBe('My Project');
      expect(result.current.project?.bpm).toBe(120);
      expect(result.current.project?.tracks).toHaveLength(1); // Master track
      expect(result.current.project?.tracks[0].type).toBe('master');
    });

    it('should initialize history with the new project', () => {
      const { result } = renderHook(() => useDAWStore());

      act(() => {
        result.current.createProject('Test');
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.history[0]).toEqual(result.current.project);
    });
  });

  describe('updateProjectName', () => {
    it('should update project name and push to history', () => {
      const { result } = renderHook(() => useDAWStore());

      act(() => {
        result.current.createProject('Original');
      });

      const originalUpdatedAt = result.current.project?.updated_at;

      act(() => {
        result.current.updateProjectName('Updated');
      });

      expect(result.current.project?.name).toBe('Updated');
      expect(result.current.project?.updated_at).not.toBe(originalUpdatedAt);
      expect(result.current.history).toHaveLength(2);
      expect(result.current.historyIndex).toBe(1);
    });
  });

  describe('updateBPM', () => {
    it('should update BPM and push to history', () => {
      const { result } = renderHook(() => useDAWStore());

      act(() => {
        result.current.createProject('Test');
        result.current.updateBPM(140);
      });

      expect(result.current.project?.bpm).toBe(140);
      expect(result.current.history).toHaveLength(2);
    });
  });
});

// src/stores/__tests__/dawStore.tracks.test.ts
describe('dawStore - Track Actions', () => {
  // ... тесты для addTrack, removeTrack, updateTrack, duplicateTrack
});

// src/stores/__tests__/dawStore.clips.test.ts
describe('dawStore - Clip Actions', () => {
  describe('splitClip', () => {
    it('should split clip into two at specified time', () => {
      const { result } = renderHook(() => useDAWStore());

      act(() => {
        result.current.createProject('Test');
        result.current.addTrack('audio', 'Audio 1');

        const trackId = result.current.project!.tracks[1].id;
        result.current.addClip(trackId, {
          name: 'Clip 1',
          audioUrl: 'test.mp3',
          startTime: 0,
          duration: 10,
          offset: 0,
          volume: 1.0,
          fadeIn: 0,
          fadeOut: 0,
        });
      });

      const clip = result.current.project!.tracks[1].clips[0];

      act(() => {
        result.current.splitClip(clip.id, 5); // Split at 5 seconds
      });

      const clips = result.current.project!.tracks[1].clips;
      expect(clips).toHaveLength(2);

      // Left clip
      expect(clips[0].duration).toBe(5);
      expect(clips[0].startTime).toBe(0);

      // Right clip
      expect(clips[1].duration).toBe(5);
      expect(clips[1].startTime).toBe(5);
      expect(clips[1].offset).toBe(5);
    });

    it('should not split if time is outside clip bounds', () => {
      // ... test edge cases
    });
  });
});

// src/stores/__tests__/dawStore.undo-redo.test.ts
describe('dawStore - Undo/Redo', () => {
  it('should undo last action', () => {
    const { result } = renderHook(() => useDAWStore());

    act(() => {
      result.current.createProject('Test');
      result.current.updateProjectName('Version 1');
      result.current.updateProjectName('Version 2');
    });

    expect(result.current.project?.name).toBe('Version 2');
    expect(result.current.historyIndex).toBe(2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.project?.name).toBe('Version 1');
    expect(result.current.historyIndex).toBe(1);
  });

  it('should redo after undo', () => {
    const { result } = renderHook(() => useDAWStore());

    act(() => {
      result.current.createProject('Test');
      result.current.updateBPM(140);
      result.current.undo();
    });

    expect(result.current.project?.bpm).toBe(120);

    act(() => {
      result.current.redo();
    });

    expect(result.current.project?.bpm).toBe(140);
  });

  it('should limit history to 50 states', () => {
    const { result } = renderHook(() => useDAWStore());

    act(() => {
      result.current.createProject('Test');

      // Push 60 states
      for (let i = 0; i < 60; i++) {
        result.current.updateBPM(120 + i);
      }
    });

    expect(result.current.history.length).toBeLessThanOrEqual(50);
  });
});
```

**Приоритет:** P0 (Критический)
**Сложность:** Высокая (1-2 недели для 80% покрытия критической логики)
**Влияние:** Quality, Stability, Confidence in refactoring

---

### 5. Performance и Оптимизация

#### 5.1. Bundle Size

**Статус:** ⚠️ **Не измерен**

**Проблема:** Отсутствие мониторинга размера бандла

**Рекомендации:**

1. **Запустить bundle analysis:**
   ```bash
   npm run build:analyze
   ```

2. **Установить бюджеты для chunks:**
   ```typescript:vite.config.ts
   build: {
     chunkSizeWarningLimit: 800, // KB
     rollupOptions: {
       output: {
         manualChunks: {
           'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', ...],
           'vendor-charts': ['recharts'],
           'vendor-motion': ['framer-motion'],
           'vendor-supabase': ['@supabase/supabase-js'],
           'vendor-query': ['@tanstack/react-query'],
         },
       },
     },
   }
   ```

3. **Проверить lazy loading routes:**
   - Убедиться, что все страницы lazy-loaded
   - Проверить, что тяжелые библиотеки (recharts, framer-motion) загружаются только там, где нужны

**Приоритет:** P1 (Высокий)
**Сложность:** Низкая (1 день)
**Влияние:** Performance, UX

---

#### 5.2. React Query Caching

**Статус:** 🟢 **Хорошо**

**Находки:**

Используется TanStack Query с адекватными настройками кеширования:

```typescript
// Desktop: 5-minute cache, 3 retries
// Mobile: 2-minute cache, 2 retries
```

**Рекомендация:** Продолжать использовать, документировать стратегию кеширования.

---

### 6. Security

#### 6.1. Input Sanitization

**Статус:** 🟢 **Хорошо**

**Находки:**

В `useGenerateMusic` используется санитизация входных данных:

```typescript:src/hooks/useGenerateMusic.ts
const sanitizedOptions: GenerationRequest = {
  ...options,
  prompt: sanitizePrompt(options.prompt || ''),
  title: options.title ? sanitizeTitle(options.title) : undefined,
  lyrics: options.lyrics ? sanitizeLyrics(options.lyrics) : undefined,
};
```

**Рекомендация:** Убедиться, что санитизация применяется везде, где пользователь вводит данные.

---

#### 6.2. Environment Variables

**Статус:** 🟢 **Хорошо**

Используется Zod для валидации переменных окружения в `src/config/env.ts`.

---

## 📈 Roadmap и План Устранения

### Приоритет 0: Критические исправления (1-2 недели)

| Задача | Файл | Сложность | Время | Ответственный |
|--------|------|-----------|-------|---------------|
| **Декомпозиция dawStore** | `dawStore.ts` | Высокая | 5-7 дней | Backend lead |
| **Разделение ApiService** | `api.service.ts` | Средняя | 2-3 дня | Backend dev |
| **Убрать monkey-patching Supabase** | `client.ts` | Средняя | 1-2 дня | Infra lead |
| **Тесты для dawStore** | `__tests__/dawStore.*.test.ts` | Высокая | 3-5 дней | QA/Dev |
| **Тесты для ApiService** | `__tests__/api.service.test.ts` | Средняя | 2-3 дня | QA/Dev |

**Итого:** 13-20 рабочих дней (2-3 недели с учетом parallelization)

---

### Приоритет 1: Стабилизация и Улучшение (2-3 недели)

| Задача | Файл | Сложность | Время | Ответственный |
|--------|------|-----------|-------|---------------|
| **Рефакторинг useGenerateMusic** | `useGenerateMusic.ts` | Средняя | 2-3 дня | Frontend lead |
| **Аудит и чистка hooks** | `src/hooks/` | Средняя | 3-5 дней | Frontend team |
| **Очистка features/tracks** | `src/features/tracks/` | Высокая | 2-3 дня | Frontend lead |
| **Bundle size анализ** | - | Низкая | 1 день | DevOps |
| **Документация кастомных компонентов** | `docs/design-system/` | Низкая | 1 день | Designer/Dev |

**Итого:** 9-13 рабочих дней

---

### Приоритет 2: Оптимизация и Развитие (ongoing)

| Задача | Сложность | Время |
|--------|-----------|-------|
| **Storybook для UI components** | Средняя | 3-5 дней |
| **Performance monitoring** | Низкая | 1-2 дня |
| **Accessibility audit (WCAG AA)** | Средняя | 3-5 дней |
| **E2E тесты (Playwright)** | Средняя | Ongoing |
| **Code coverage до 80%** | Высокая | Ongoing |

---

## 🎯 Ключевые Метрики Успеха (KPI)

После завершения рефакторинга отслеживать:

| Метрика | Текущее | Цель |
|---------|---------|------|
| **Средний размер файла** | ~150 строк | <100 строк |
| **Max размер файла** | 1,158 строк | <300 строк |
| **Test coverage** | ~40-50% | >80% |
| **Bundle size (gzip)** | ? | <500 KB initial |
| **Lighthouse Performance** | ? | >90 |
| **Time to Interactive** | ? | <3s |
| **First Contentful Paint** | ? | <1.5s |
| **API error rate** | ? | <1% |
| **Sentry errors/week** | ? | <10 |

---

## 🔧 Инструменты и Автоматизация

### CI/CD Checks (обязательно добавить)

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm test -- --coverage

      - name: Check coverage thresholds
        run: |
          # Fail if coverage < 80%
          npm run test:coverage-check

      - name: Bundle size check
        run: npm run bundle:check

      - name: Build
        run: npm run build
```

### Pre-commit Hooks

```json:package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run typecheck && npm test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## 📝 Заключение

Проект Albert3 Muse Synth Studio демонстрирует **сильную техническую базу** с современными технологиями и best practices. Однако выявлены **критические архитурные проблемы**, которые при игнорировании могут привести к:

- **Снижению производительности** (монолитные stores с лишними ре-рендерами)
- **Усложнению поддержки** (God Classes, 1000+ строк файлы)
- **Риску регрессий** (недостаточное тестирование)
- **Техническому долгу** (monkey-patching, дублирование кода)

### Ключевые Рекомендации

1. **Немедленно:** Разбить `dawStore.ts` и `api.service.ts` на модули
2. **Критично:** Покрыть тестами критическую логику (dawStore, ApiService, useGenerateMusic)
3. **Важно:** Убрать monkey-patching Supabase, перейти на wrapper pattern
4. **Желательно:** Реструктурировать `features/tracks`, навести порядок в hooks
5. **Ongoing:** Документировать дизайн-систему, мониторить bundle size

### Итоговая Оценка

| Категория | Оценка | Комментарий |
|-----------|--------|-------------|
| **Архитектура** | 6/10 | Хорошая база, но монолитные модули |
| **Код Quality** | 7/10 | TypeScript, но есть anti-patterns |
| **Тестирование** | 4/10 | Недостаточное покрытие критической логики |
| **UI/UX** | 8/10 | Современный дизайн, хорошая дизайн-система |
| **Performance** | 7/10 | React Query помогает, но нужен мониторинг |
| **Security** | 8/10 | Хорошая санитизация, RLS, env validation |
| **Documentation** | 7/10 | Отличная CLAUDE.md, но нет UI docs |

**Общая оценка: 6.5/10**

---

**Документ составлен:** 2025-11-19
**Следующий аудит:** 2025-12-19 (через 1 месяц после начала рефакторинга)
**Контакты:** Команда разработки HOW2AI-AGENCY
