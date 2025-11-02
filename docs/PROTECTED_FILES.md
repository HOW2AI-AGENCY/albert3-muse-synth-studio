# 🔒 Защищенные файлы проекта

## Критичные компоненты, требующие code review

### AI Provider Integrations
- `supabase/functions/_shared/suno.ts` (1066 строк)
- `supabase/functions/_shared/mureka.ts` (1000+ строк)
- `supabase/functions/_shared/generation-handler.ts`

### Generation Logic
- `supabase/functions/generate-suno/`
- `supabase/functions/generate-mureka/`
- `supabase/functions/suno-callback/`
- `supabase/functions/suno-webhook/`

### Single Source of Truth
- `src/types/providers.ts`
- `src/config/provider-models.ts`
- `src/services/providers/types.ts`

### Database
- `supabase/migrations/`
- `src/integrations/supabase/types.ts`

⚠️ **Изменения требуют review согласно .github/CODEOWNERS**
