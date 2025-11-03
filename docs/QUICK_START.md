# 🚀 Quick Start Guide: Architecture v2.0.0

## Для новых разработчиков

### 1. Основные принципы

**ВСЕГДА используйте:**
```typescript
// ✅ Breakpoints
import { useBreakpoints } from '@/hooks/useBreakpoints';
const { isMobile, isTablet, isDesktop } = useBreakpoints();

// ✅ Responsive Grid
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
const { columns, gap, cardWidth } = useResponsiveGrid(containerWidth);

// ✅ Track Types
import type { Track, DisplayTrack } from '@/types/domain/track.types';
import { trackConverters } from '@/types/domain/track.types';

// ✅ Repository Pattern
import { getTrackRepository } from '@/repositories';
const trackRepo = getTrackRepository();
```

**НЕ используйте:**
```typescript
// ❌ Deprecated
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdaptiveGrid } from '@/hooks/useAdaptiveGrid';

// ❌ Прямой доступ к Supabase в компонентах
import { supabase } from '@/integrations/supabase/client';
```

---

## 2. Защищенные файлы

**НЕЛЬЗЯ изменять без одобрения Team Lead:**
- `src/config/breakpoints.config.ts`
- `src/types/domain/track.types.ts`
- `src/repositories/interfaces/TrackRepository.ts`
- `src/hooks/useResponsiveGrid.ts`

**Проверка:** Файлы в `.protectedrc.json`

---

## 3. Создание нового компонента

```typescript
// src/components/MyComponent.tsx
import { useBreakpoints } from '@/hooks/useBreakpoints';
import type { Track } from '@/types/domain/track.types';
import { getTrackRepository } from '@/repositories';

export const MyComponent = () => {
  const { isMobile } = useBreakpoints();
  const trackRepo = getTrackRepository();
  
  const { data: tracks } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => trackRepo.findAll()
  });
  
  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {tracks?.map(track => (
        <TrackCard key={track.id} track={track} />
      ))}
    </div>
  );
};
```

---

## 4. Unit Testing

```typescript
// tests/unit/MyComponent.test.tsx
import { MockTrackRepository } from '@/repositories/MockTrackRepository';
import { resetTrackRepository } from '@/repositories';

describe('MyComponent', () => {
  beforeEach(() => {
    // Reset to use MockTrackRepository
    resetTrackRepository();
  });
  
  it('renders tracks', async () => {
    const mockRepo = new MockTrackRepository([
      { id: '1', title: 'Test Track' }
    ]);
    
    // Test with mock data
  });
});
```

---

## 5. Checklist для PR

- [ ] Используются protected типы (`Track`, `DisplayTrack`)
- [ ] Используется `useBreakpoints()` вместо `useIsMobile()`
- [ ] Используется `Repository Pattern` вместо прямого Supabase
- [ ] Добавлены unit-тесты
- [ ] Нет изменений в protected файлах (или есть одобрение Team Lead)
- [ ] Обновлена документация при необходимости

---

*Версия: 2.0.0 | Дата: 2025-11-03*
