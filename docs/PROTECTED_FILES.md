# 🔒 Защищенные файлы проекта

## Критичные компоненты, требующие code review

### 🎯 Core Configuration (PROTECTED - v2.0.0)
- `src/config/breakpoints.config.ts` **[NEW]** - Единый источник правды для breakpoints
- `src/types/domain/track.types.ts` **[NEW]** - Единый источник правды для типов Track
- `.protectedrc.json` **[NEW]** - Конфигурация защищенных файлов

### 🏗️ Repository Layer (PROTECTED - v2.0.0)
- `src/repositories/interfaces/TrackRepository.ts` **[NEW]** - Интерфейс репозитория
- `src/repositories/SupabaseTrackRepository.ts` **[NEW]** - Supabase имплементация
- `src/repositories/MockTrackRepository.ts` **[NEW]** - Mock для тестов

### 🎨 Responsive System (PROTECTED - v2.0.0)
- `src/hooks/useResponsiveGrid.ts` **[NEW]** - Адвансированная адаптивная сетка
- `src/hooks/useBreakpoints.ts` **[UPDATED]** - Централизованные breakpoints

### 🤖 AI Provider Integrations
- `supabase/functions/_shared/suno.ts` (1066 строк)
- `supabase/functions/_shared/mureka.ts` (1000+ строк)
- `supabase/functions/_shared/generation-handler.ts`

### 🎵 Generation Logic
- `supabase/functions/generate-suno/`
- `supabase/functions/generate-mureka/`
- `supabase/functions/suno-callback/`
- `supabase/functions/suno-webhook/`

### 📊 Provider Configuration
- `src/types/providers.ts`
- `src/config/provider-models.ts`
- `src/services/providers/types.ts`

### 💾 Database
- `supabase/migrations/`
- `src/integrations/supabase/types.ts`

---

## ⚠️ Deprecated Files (удалить после 2025-12-01)

### 🗑️ Будут удалены
- `src/hooks/use-mobile.tsx` → использовать `useBreakpoints()`
- `src/hooks/useAdaptiveGrid.ts` → использовать `useResponsiveGrid()`

---

## 📋 Правила модификации

1. **Требуется одобрение Team Lead** для изменения файлов в разделе "PROTECTED"
2. **Требуются тесты** для всех изменений в критичных компонентах
3. **Требуется документация** для архитектурных изменений (ADR)
4. **Запрещено переименование/удаление** protected файлов без согласования

---

⚠️ **Все изменения требуют review согласно .github/CODEOWNERS и .protectedrc.json**

*Последнее обновление: 2025-11-03 (v2.0.0)*
