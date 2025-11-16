# 🚀 Quick Start Guide - Albert3 Muse Synth Studio

**Для разработчиков, которые хотят быстро начать работу**

---

## ⚡ 5-минутный старт

### 1. Clone & Install
```bash
git clone https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio
npm install
```

### 2. Start Development
```bash
npm run dev
```

Откройте http://localhost:5173

### 3. Authenticate
1. Кликните "Sign Up"
2. Используйте любой email (auto-confirm включен)
3. Готово! Вы в приложении

---

## 📂 Структура проекта (важное)

```
src/
├── components/          # React компоненты
│   ├── generator/      # Music Generator V2 (модульный)
│   ├── tracks/         # Track management + bulk ops
│   ├── player/         # Audio player (global, mini, fullscreen)
│   ├── daw/           # DAW Editor components
│   └── ui/            # shadcn/ui components (35+)
│
├── hooks/              # Custom React hooks (90+)
│   ├── useTracks.ts          # Track CRUD
│   ├── useGenerateMusic.ts   # Music generation
│   ├── useDAWProjects.ts     # DAW project management
│   ├── useDAWAutoSave.ts     # Auto-save (NEW!)
│   └── ...
│
├── stores/             # Zustand state management
│   ├── audioPlayerStore.ts   # Global player state
│   ├── dawStore.ts          # DAW editor state
│   └── ...
│
├── utils/              # Utility functions
│   ├── dawColors.ts         # DAW color system (NEW!)
│   ├── bulkOperations.ts    # Bulk operations (NEW!)
│   └── ...
│
├── services/           # API services
│   └── GenerationService.ts  # Music generation router
│
supabase/
├── functions/          # Edge Functions (Deno)
│   ├── generate-suno/      # Suno AI integration
│   ├── generate-mureka/    # Mureka AI integration
│   └── _shared/           # Shared utilities
│
└── migrations/         # SQL migrations
```

---

## 🛠️ Типичные задачи

### Добавить новый UI компонент
```bash
# 1. Создать компонент
touch src/components/MyComponent.tsx

# 2. Использовать shadcn/ui primitives
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

# 3. Применить мемоизацию
export const MyComponent = React.memo(({ data }) => {
  // Component logic
});
```

### Создать новый custom hook
```bash
# 1. Создать файл
touch src/hooks/useMyFeature.ts

# 2. Использовать React Query
import { useQuery, useMutation } from '@tanstack/react-query';

export function useMyFeature() {
  const { data } = useQuery({
    queryKey: ['my-feature'],
    queryFn: fetchData,
  });
  
  return { data };
}
```

### Добавить Edge Function
```bash
# 1. Создать функцию
mkdir supabase/functions/my-function
touch supabase/functions/my-function/index.ts

# 2. Реализовать handler
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // Function logic
});

# 3. Деплой автоматический (при commit)
```

### Создать миграцию БД
```typescript
// В Lovable, используйте supabase--migration tool
// Пример:
await supabase--migration({
  query: `
    CREATE TABLE my_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage own data"
      ON my_table FOR ALL
      USING (auth.uid() = user_id);
  `
});
```

---

## 🔥 Новые фичи (Phase 8)

### 1. Bulk Operations
```typescript
import { 
  bulkDeleteTracks, 
  bulkDownloadTracks,
  bulkAddToProject 
} from '@/utils/bulkOperations';

// Удалить несколько треков с прогрессом
await bulkDeleteTracks(trackIds, (progress) => {
  console.log(`${progress.completed}/${progress.total}`);
});

// Скачать несколько треков
await bulkDownloadTracks(tracks, onProgress);

// Добавить в проект
await bulkAddToProject(trackIds, projectId, onProgress);
```

### 2. DAW Project Storage
```typescript
import { useDAWProjects } from '@/hooks/useDAWProjects';
import { useDAWAutoSave } from '@/hooks/useDAWAutoSave';

function DAWEditor() {
  const { saveProject, loadProject, projects } = useDAWProjects();
  const [dawState, setDawState] = useState(null);
  
  // Auto-save каждые 2 секунды (debounced)
  useDAWAutoSave(dawState, projectId, 2000);
  
  // Ручное сохранение
  const handleSave = async () => {
    await saveProject({
      projectId,
      data: {
        name: 'My Project',
        bpm: 120,
        regions: dawState.regions,
        tracks: dawState.tracks,
      },
    });
  };
  
  return <div>DAW Editor UI</div>;
}
```

### 3. DAW Color System
```typescript
import { getCanvasColors } from '@/utils/dawColors';

function MyCanvasComponent() {
  const colors = getCanvasColors();
  
  // Use in canvas drawing
  ctx.fillStyle = colors.background;
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = colors.waveform;
}
```

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Write Tests
```typescript
// src/hooks/__tests__/useTracks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTracks } from '../useTracks';

describe('useTracks', () => {
  it('should fetch tracks', async () => {
    const { result } = renderHook(() => useTracks());
    
    await waitFor(() => {
      expect(result.current.tracks).toBeDefined();
    });
  });
});
```

---

## 🐛 Debugging

### Console Logs
- Включены в development mode
- Отключены в production
- Используйте `console.log('[ComponentName]', data)`

### React DevTools
1. Установите расширение
2. Откройте DevTools (F12)
3. Вкладка "Components" - tree компонентов
4. Вкладка "Profiler" - performance

### Network Inspector
1. Откройте DevTools (F12)
2. Вкладка "Network"
3. Фильтр: "Fetch/XHR"
4. Проверяйте API requests

---

## 📚 Полезные ссылки

- [CLAUDE.md](../../CLAUDE.md) - Полный гайд для AI-ассистентов
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Правила контрибьютинга
- [Phase 8 Summary](./PHASE_8_SUMMARY.md) - Детали Phase 8
- [Logic Audit](../audit/LOGIC_AUDIT_2025-11-16.md) - Аудит кода
- [Tasks Status](../../tasks/TASKS_STATUS.md) - Текущие задачи

---

## 💡 Pro Tips

1. **Используйте React.memo** для всех компонентов
2. **useCallback** для всех event handlers
3. **React Query** для всех API запросов
4. **Zustand** для глобального state
5. **TypeScript** строгая типизация
6. **HSL цвета** из design system (не прямые цвета!)
7. **Repository Pattern** для data access
8. **Edge Functions** для backend logic

---

## 🆘 Нужна помощь?

- Создайте issue на GitHub
- Проверьте [CLAUDE.md](../../CLAUDE.md) для детальной документации
- Посмотрите [примеры кода](../examples/)

**Happy Coding! 🎉**
