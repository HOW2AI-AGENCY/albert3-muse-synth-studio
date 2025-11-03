# 🚀 Quick Start Guide - Albert3 Muse Synth Studio v3.0.0

**Для разработчиков, впервые работающих с проектом**

---

## ⚡ 5-минутный старт

### 1. Клонирование и установка

```bash
git clone https://github.com/your-org/albert3-muse-synth.git
cd albert3-muse-synth
npm install
npm run dev
```

Откройте http://localhost:5173 - готово! 🎉

---

## 📚 Основные концепции

### 1. Repository Pattern

**Не используйте Supabase напрямую в компонентах!**

```typescript
// ❌ НЕПРАВИЛЬНО
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('tracks').select('*');

// ✅ ПРАВИЛЬНО
import { getTrackRepository } from '@/repositories';
const repository = getTrackRepository();
const tracks = await repository.findAll();
```

**Почему?**
- Легко менять реализацию (Supabase → REST API)
- Легко тестировать (используем MockRepository)
- Единая точка доступа к данным

### 2. Modular Hooks

**Используйте специализированные хуки вместо монолитных:**

```typescript
// ❌ Старый подход (monolithic)
import { useTracks } from '@/hooks/useTracks'; // 310 lines

const { tracks, deleteTrack, isLoading } = useTracks();

// ✅ Новый подход (modular)
import { useTracksQuery } from '@/hooks/tracks/useTracksQuery';
import { useTracksMutations } from '@/hooks/tracks/useTracksMutations';

const { data: tracks, isLoading } = useTracksQuery();
const { deleteTrack } = useTracksMutations();
```

**Доступные модули:**
- `useTracksQuery` - Fetching данных
- `useTracksRealtime` - Realtime subscriptions
- `useTracksPolling` - Polling fallback
- `useTracksMutations` - CRUD операции

### 3. Universal Hooks

**Переиспользуйте общие хуки:**

```typescript
import { useInterval } from '@/hooks/common/useInterval';
import { useDebounce } from '@/hooks/common/useDebounce';
import { useRealtimeSubscription } from '@/hooks/common/useRealtimeSubscription';

// Polling каждые 5 секунд
useInterval(() => refetch(), 5000);

// Debounce поискового запроса
const debouncedSearch = useDebounce(search, 500);

// Generic realtime subscription
useRealtimeSubscription<Track>('channel', 'tracks', 'filter', callback);
```

### 4. Protected Files

**Некоторые файлы защищены от случайных изменений:**

```
src/config/breakpoints.config.ts
src/types/domain/track.types.ts
src/repositories/interfaces/TrackRepository.ts
```

**Как изменить защищенный файл:**

1. Создайте GitHub Issue: `[PROTECTED] Modify <filename>`
2. Опишите причину изменения
3. Дождитесь одобрения Team Lead
4. Коммитьте с маркером:

```bash
git commit -m "refactor(types): update Track interface [APPROVED]"
```

Pre-commit hook автоматически проверит наличие `[APPROVED]`.

---

## 🎨 Code Style

### TypeScript

```typescript
// ✅ Explicit return types
export async function generateMusic(prompt: string): Promise<Track> {
  // ...
}

// ✅ No 'any' - use proper types
const data: Track[] = [];

// ✅ JSDoc for public APIs
/**
 * Generate music from prompt
 * @param prompt - Music description
 * @returns Generated track
 */
export function generateMusic(prompt: string): Promise<Track> {
  // ...
}
```

### React

```typescript
// ✅ Functional components with memo
export const TrackCard = React.memo(({ track, onPlay }: Props) => {
  const handlePlay = useCallback(() => {
    onPlay(track.id);
  }, [track.id, onPlay]);

  return <Card onClick={handlePlay}>{track.title}</Card>;
});

TrackCard.displayName = 'TrackCard';
```

### File Naming

- **Components:** `PascalCase.tsx` → `TrackCard.tsx`
- **Hooks:** `camelCase.ts` → `useTracks.ts`
- **Utils:** `camelCase.ts` → `formatters.ts`
- **Types:** `kebab-case.types.ts` → `track.types.ts`

### Imports

```typescript
// ✅ Use absolute imports with @
import { Track } from '@/types/domain/track.types';
import { getTrackRepository } from '@/repositories';

// ❌ Don't use relative imports for deep paths
import { Track } from '../../../types/domain/track.types';
```

---

## 🧪 Testing

### Running Tests

```bash
npm test                    # All tests
npm test -- TrackCard       # Specific test
npm run test:coverage       # Coverage report
```

### Writing Tests

```typescript
// src/components/__tests__/TrackCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackCard } from '../TrackCard';

describe('TrackCard', () => {
  it('renders track title', () => {
    const track = { id: '1', title: 'Test Track' };
    render(<TrackCard track={track} />);
    
    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });
});
```

**Coverage Requirements:**
- Unit tests: >80%
- Integration tests: Critical paths
- E2E tests: User workflows

---

## 📦 Useful Scripts

```bash
# Development
npm run dev                      # Start dev server
npm run build                    # Production build
npm run preview                  # Preview production build

# Code Quality
npm run lint                     # ESLint
npm run type-check              # TypeScript check
npm test                         # Run tests

# Automation
npm run migrate:breakpoints     # Migrate deprecated code
npm run validate:protected      # Validate protected files
npm run prepare                 # Setup Husky hooks
```

---

## 🔍 Debugging

### 1. Check Console Logs

Используйте `logger` вместо `console.log`:

```typescript
import { logger } from '@/utils/logger';

logger.info('Track created', 'TrackCard', { trackId: '123' });
logger.error('Failed to create track', error, 'TrackCard');
```

### 2. React Query Devtools

Откройте devtools для просмотра кеша:

```bash
# В браузере нажмите:
# Ctrl + Shift + I → React Query Devtools tab
```

### 3. Network Requests

Проверьте Network tab для API запросов к Supabase Edge Functions.

---

## 🚀 Common Tasks

### Task 1: Add New Feature

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Write code
# 3. Write tests
npm test

# 4. Commit
git commit -m "feat(my-feature): add awesome feature"

# 5. Push & create PR
git push origin feature/my-feature
```

### Task 2: Fix Bug

```bash
# 1. Create fix branch
git checkout -b fix/bug-name

# 2. Fix bug
# 3. Add regression test
# 4. Commit
git commit -m "fix(component): resolve issue with X"
```

### Task 3: Refactor Code

```bash
# 1. Create refactor branch
git checkout -b refactor/component-name

# 2. Refactor
# 3. Ensure tests pass
npm test

# 4. Commit
git commit -m "refactor(component): extract reusable hook"
```

---

## 📞 Getting Help

### 1. Read Documentation

- [Architecture](./architecture/SYSTEM_OVERVIEW.md) - System design
- [Contributing](./CONTRIBUTING.md) - Contribution guide
- [API Reference](./API.md) - Edge Functions docs

### 2. Check Examples

Изучите существующие компоненты:
- `src/features/tracks/components/TrackCard.tsx` - Пример feature component
- `src/hooks/tracks/useTracksQuery.ts` - Пример custom hook
- `src/repositories/SupabaseTrackRepository.ts` - Пример repository

### 3. Ask Questions

- 💬 [GitHub Discussions](https://github.com/your-org/albert3-muse-synth/discussions)
- 📧 Email: dev@albert3.app

---

## ✅ Checklist для нового разработчика

- [ ] Склонировал репозиторий
- [ ] Установил зависимости (`npm install`)
- [ ] Запустил dev-сервер (`npm run dev`)
- [ ] Прочитал `CONTRIBUTING.md`
- [ ] Прочитал `architecture/SYSTEM_OVERVIEW.md`
- [ ] Настроил pre-commit hooks (`npm run prepare`)
- [ ] Запустил тесты (`npm test`)
- [ ] Создал первый Pull Request

---

**Welcome to Albert3 Muse Synth Studio! 🎵**

Happy coding! 🚀
