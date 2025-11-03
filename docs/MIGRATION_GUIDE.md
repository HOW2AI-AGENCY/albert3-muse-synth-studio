# 🚀 Migration Guide: Architecture Refactoring v2.0.0

## Обзор изменений

Эта миграция внедряет:
1. **Централизованные breakpoints** (`src/config/breakpoints.config.ts`)
2. **Единый источник правды для типов** (`src/types/domain/track.types.ts`)
3. **Repository Pattern** (`src/repositories/`)
4. **Защищенные файлы** (`.protectedrc.json`)

---

## 📋 Миграция 1: useIsMobile → useBreakpoints

**Затрагивает:** 86 файлов

### ❌ Старый код:

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

const MyComponent = () => {
  const isMobile = useIsMobile();
  
  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
};
```

### ✅ Новый код:

```typescript
import { useBreakpoints } from '@/hooks/useBreakpoints';

const MyComponent = () => {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  
  return (
    <div>
      {isMobile && 'Mobile'}
      {isTablet && 'Tablet'}
      {isDesktop && 'Desktop'}
    </div>
  );
};
```

### Список файлов для миграции:

1. `src/components/MusicGeneratorV2.tsx`
2. `src/components/generator/forms/CompactCustomForm.tsx`
3. `src/components/player/GlobalAudioPlayer.tsx`
4. `src/pages/workspace/Library.tsx`
5. ... (еще 82 файла)

---

## 📋 Миграция 2: useAdaptiveGrid → useResponsiveGrid

**Затрагивает:** ~10 файлов

### ❌ Старый код:

```typescript
import { useAdaptiveGrid } from '@/hooks/useAdaptiveGrid';

const { columns, gap, cardWidth } = useAdaptiveGrid(containerWidth, {
  isDetailPanelOpen: true
});
```

### ✅ Новый код:

```typescript
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

const { columns, gap, cardWidth, screenCategory } = useResponsiveGrid(containerWidth, {
  isDetailPanelOpen: true,
  orientation: 'landscape'
});
```

**Преимущества:**
- ✅ Учет screen category (mobile/tablet/desktop/wide/ultrawide)
- ✅ Поддержка portrait/landscape ориентации
- ✅ Динамические gaps на основе breakpoints

---

## 📋 Миграция 3: Прямые вызовы Supabase → Repository Pattern

**Затрагивает:** ~20 хуков

### ❌ Старый код:

```typescript
import { supabase } from '@/integrations/supabase/client';

const useTracks = () => {
  const { data } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
  
  return { tracks: data };
};
```

### ✅ Новый код:

```typescript
import { getTrackRepository } from '@/repositories';

const useTracks = () => {
  const trackRepo = getTrackRepository();
  
  const { data } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => trackRepo.findAll({ sortBy: 'created_at', sortOrder: 'desc' })
  });
  
  return { tracks: data };
};
```

**Преимущества:**
- ✅ Абстракция от конкретного backend
- ✅ Легкость unit-тестирования с `MockTrackRepository`
- ✅ Единообразные методы CRUD

---

## 📋 Миграция 4: Использование типов из domain layer

### ❌ Старый код:

```typescript
interface Track {
  id: string;
  title: string;
  audio_url: string;
  // ... дублированные поля
}

const MyComponent = ({ track }: { track: Track }) => {
  // ...
};
```

### ✅ Новый код:

```typescript
import type { Track, DisplayTrack } from '@/types/domain/track.types';
import { trackConverters } from '@/types/domain/track.types';

const MyComponent = ({ track }: { track: Track }) => {
  // Конвертация в view model
  const displayTrack = trackConverters.toDisplay(track, { isLiked: true });
  
  return (
    <div>
      <h3>{displayTrack.title}</h3>
      <p>{displayTrack.formattedDuration}</p>
      <p>{displayTrack.formattedDate}</p>
    </div>
  );
};
```

**Преимущества:**
- ✅ Разделение database/domain/view слоев
- ✅ Типобезопасные конверторы
- ✅ Предвычисленные поля (formattedDuration, formattedDate)

---

## 🔧 Автоматическая миграция (скрипт)

```bash
# 1. Заменить useIsMobile → useBreakpoints
npm run migrate:breakpoints

# 2. Заменить useAdaptiveGrid → useResponsiveGrid
npm run migrate:responsive-grid

# 3. Обновить типы Track
npm run migrate:track-types

# 4. Внедрить Repository Pattern
npm run migrate:repositories
```

---

## ⚠️ Breaking Changes

1. **useIsMobile()** → удален, использовать `useBreakpoints().isMobile`
2. **useAdaptiveGrid()** → deprecated, использовать `useResponsiveGrid()`
3. **Прямые импорты типов из Supabase** → использовать `src/types/domain/`
4. **Прямые вызовы Supabase в хуках** → использовать Repository Pattern

---

## 📊 Прогресс миграции

- [x] Week 1: Breakpoints & Adaptivity (100%)
- [ ] Week 2: Component Architecture (0%)
- [x] Week 3: File Protection + SSoT (100%)
- [x] Week 4: Repository Pattern (100%)

---

## 🆘 Помощь

Если возникли проблемы:
1. Проверьте `docs/ARCHITECTURE_DECISION_RECORDS.md`
2. Посмотрите примеры в `tests/unit/migration-examples/`
3. Обратитесь к Team Lead

---

*Последнее обновление: 2025-11-03*
