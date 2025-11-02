# 🛠️ Development Guide

## Локальная разработка

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-username/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio

# 2. Установить зависимости
npm install

# 3. Запустить dev-сервер
npm run dev

# 4. Открыть в браузере
# http://localhost:5173
```

### Настройка Supabase (локально)

```bash
# Установить Supabase CLI
npm install -g supabase

# Запустить локальный Supabase
supabase start

# Применить миграции
supabase db reset

# Деплой Edge Functions
supabase functions deploy --all

# Настроить секреты
supabase secrets set SUNO_API_KEY=your-key
supabase secrets set MUREKA_API_KEY=your-key
```

### Environment Variables

```bash
# .env (автоматически создается Supabase)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Структура проекта

```
albert3-muse-synth-studio/
├── src/                          # Frontend source
│   ├── components/               # React компоненты
│   │   ├── ui/                  # shadcn/ui компоненты
│   │   ├── player/              # Audio Player
│   │   ├── tracks/              # Track components
│   │   └── generator/           # Music Generator
│   ├── hooks/                   # Custom hooks
│   ├── features/                # Domain features
│   ├── services/                # API services
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utilities
│
├── supabase/                     # Backend
│   ├── functions/               # Edge Functions
│   │   ├── generate-suno/      # 🔒 Suno generation
│   │   ├── generate-mureka/    # 🔒 Mureka generation
│   │   └── _shared/            # 🔒 Shared modules
│   └── migrations/              # SQL migrations
│
└── docs/                        # Documentation
```

---

## Соглашения кода

### Naming Conventions

```typescript
// Variables & Functions: camelCase
const trackDuration = 180;
const playTrack = () => {};

// Components: PascalCase
const TrackCard = () => {};

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// Types/Interfaces: PascalCase
type TrackStatus = 'pending' | 'completed';
interface TrackCardProps {}

// Files:
// - Components: PascalCase (TrackCard.tsx)
// - Hooks: camelCase (useTrackVersions.ts)
// - Utils: kebab-case (track-helpers.ts)
```

### Commit Messages (Conventional Commits)

```bash
# Format: <type>(<scope>): <subject>

feat(player): add queue management
fix(api): resolve Suno timeout issues
docs(readme): update installation guide
refactor(components): extract AudioControls
perf(list): implement virtualization
test(api): add generation tests
chore(deps): update dependencies
```

### TypeScript Guidelines

```typescript
// ✅ Правильно: явные типы для параметров и возвращаемых значений
export const createTrack = async (
  params: CreateTrackParams
): Promise<Track> => {
  // ...
};

// ✅ Правильно: использование типов из SSOT
import type { MusicProvider } from '@/types/providers';

// ❌ Неправильно: дублирование типов
type MusicProvider = 'suno' | 'mureka'; // уже есть в types/providers.ts

// ✅ Правильно: интерфейсы для объектов
interface TrackCardProps {
  track: Track;
  onPlay: (id: string) => void;
}

// ✅ Правильно: type для примитивов и union types
type TrackStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

---

## Работа с компонентами

### Component Structure

```typescript
// TrackCard.tsx
import React, { memo, useCallback, useMemo } from 'react';
import type { Track } from '@/types';

interface TrackCardProps {
  track: Track;
  onPlay: (id: string) => void;
  isPlaying?: boolean;
}

export const TrackCard = memo(({ 
  track, 
  onPlay, 
  isPlaying = false 
}: TrackCardProps) => {
  // 1. Hooks (в правильном порядке)
  const [isLiked, setIsLiked] = useState(false);
  
  // 2. Callbacks
  const handlePlay = useCallback(() => {
    onPlay(track.id);
  }, [track.id, onPlay]);
  
  // 3. Memoized values
  const formattedDuration = useMemo(
    () => formatDuration(track.duration),
    [track.duration]
  );
  
  // 4. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 5. Render
  return (
    <Card>
      {/* ... */}
    </Card>
  );
});

TrackCard.displayName = 'TrackCard';
```

### Custom Hooks

```typescript
// useTrackVersions.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export const useTrackVersions = (trackId: string) => {
  // Query для получения версий
  const { data: versions, isLoading } = useQuery({
    queryKey: ['track-versions', trackId],
    queryFn: () => fetchTrackVersions(trackId),
    enabled: !!trackId,
  });
  
  // Mutation для установки предпочитаемой версии
  const { mutate: setPreferredVersion } = useMutation({
    mutationFn: (versionId: string) => 
      updatePreferredVersion(trackId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['track-versions', trackId]);
    },
  });
  
  return {
    versions,
    isLoading,
    setPreferredVersion,
  };
};
```

---

## Работа с Edge Functions

### Создание новой Edge Function

```bash
# 1. Создать директорию
mkdir supabase/functions/my-function

# 2. Создать index.ts
touch supabase/functions/my-function/index.ts

# 3. Добавить в config.toml
# [functions.my-function]
# verify_jwt = false  # для публичных функций
```

### Базовая структура Edge Function

```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { param1, param2 } = await req.json();
    
    // Validate
    if (!param1) {
      return new Response(
        JSON.stringify({ error: 'param1 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Business logic
    const result = await doSomething(param1, param2);
    
    // Return success
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Деплой Edge Functions

```bash
# Деплой одной функции
supabase functions deploy my-function

# Деплой всех функций
supabase functions deploy --all

# Просмотр логов
supabase functions logs my-function --tail
```

---

## Тестирование

### Unit Tests (Vitest)

```typescript
// TrackCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackCard } from './TrackCard';

describe('TrackCard', () => {
  const mockTrack = {
    id: '1',
    title: 'Test Track',
    duration: 180,
  };
  
  it('renders track title', () => {
    render(<TrackCard track={mockTrack} onPlay={vi.fn()} />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });
  
  it('calls onPlay when play button clicked', () => {
    const onPlay = vi.fn();
    render(<TrackCard track={mockTrack} onPlay={onPlay} />);
    
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledWith('1');
  });
});
```

### Edge Function Tests

```typescript
// supabase/functions/my-function/my-function.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("my-function returns success", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ param1: "value" }),
  });
  
  const response = await handler(req);
  const data = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});
```

### Запуск тестов

```bash
# Frontend тесты
npm test

# Edge Function тесты
npm run supabase:test

# Coverage
npm run test:coverage
```

---

## Debugging

### Frontend Debugging

```typescript
// Использовать React DevTools
// Установить расширение: https://react.dev/learn/react-developer-tools

// Логирование в TanStack Query
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>

// Логирование в Zustand
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools((set) => ({
    // ...
  }))
);
```

### Edge Function Debugging

```bash
# Просмотр логов
supabase functions logs generate-suno --tail

# Фильтрация логов
supabase functions logs generate-suno --filter "error"

# Логирование в функции
console.log('Debug:', JSON.stringify(data, null, 2));
```

---

## Performance Monitoring

### Web Vitals

```typescript
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFCP(console.log);
getFID(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Bundle Analysis

```bash
# Анализ bundle size
npm run build
npx vite-bundle-visualizer
```

---

## 🔒 Protected Files

**КРИТИЧНО**: Перед изменением этих файлов ознакомьтесь с `.github/CODEOWNERS`

- `supabase/functions/_shared/suno.ts` — Suno API client
- `supabase/functions/_shared/mureka.ts` — Mureka API client
- `src/types/providers.ts` — Single Source of Truth для типов
- `src/config/provider-models.ts` — Single Source of Truth для моделей

Изменения требуют code review от @owner и @tech-lead.

---

## Полезные ресурсы

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Deno Manual](https://deno.land/manual)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Версия документа:** 2.4.0  
**Последнее обновление:** 2025-11-02
