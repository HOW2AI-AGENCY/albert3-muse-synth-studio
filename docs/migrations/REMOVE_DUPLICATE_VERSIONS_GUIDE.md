# Migration Guide: Remove Duplicate Track Versions

**Date:** 2025-11-04
**Priority:** P0 (Critical)
**Migration File:** `supabase/migrations/20251104203200_remove_duplicate_track_versions.sql`

## Problem

Before 2025-11-04, `suno-callback` created track versions starting from `variant_index = 0`, which duplicated the main track already stored in the `tracks` table. This caused:

1. **UI Bug**: Display showed "3 versions" instead of "2" because:
   - Main track (tracks table)
   - Duplicate version (track_versions, variant_index=0)
   - Additional version (track_versions, variant_index=1)

2. **Data Redundancy**: Two records with the same audio for each track

## Solution

### Backend Fix (Applied)
- Modified `supabase/functions/suno-callback/index.ts` to start creating versions from `variant_index = 1`
- First variant is now saved only in `tracks` table
- Additional variants go to `track_versions` starting from index 1

### Frontend Fix (Applied)
- `src/features/tracks/components/card/useTrackCardState.ts`: Use `versionCount` instead of `allVersions.length`
- `src/features/tracks/components/TrackVariantSelector.tsx`: Check `totalVersions` instead of `allVersions.length`

### Database Cleanup (Pending)
This migration removes old duplicate versions with `variant_index = 0` from `track_versions` table.

## How to Apply

### Local Development

```bash
# Via Supabase CLI
npx supabase db reset  # Reset and apply all migrations

# OR apply specific migration
npx supabase migration up --file 20251104203200_remove_duplicate_track_versions.sql
```

### Production

**Option 1: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Open SQL Editor
3. Copy content from `supabase/migrations/20251104203200_remove_duplicate_track_versions.sql`
4. Execute the SQL

**Option 2: Via Supabase CLI**
```bash
npx supabase db push
```

## Verification

After applying the migration:

### 1. Check for remaining duplicates
```sql
SELECT
  parent_track_id,
  COUNT(*) as version_count,
  array_agg(variant_index ORDER BY variant_index) as indexes
FROM track_versions
GROUP BY parent_track_id
HAVING 0 = ANY(array_agg(variant_index));
```

Expected: **0 rows** (no versions with variant_index=0)

### 2. Verify version counts
```sql
SELECT
  parent_track_id,
  COUNT(*) as version_count,
  array_agg(variant_index ORDER BY variant_index) as indexes
FROM track_versions
GROUP BY parent_track_id
ORDER BY parent_track_id;
```

Expected: All tracks should have `variant_index` starting from 1

### 3. UI Verification
- Open any track with multiple versions
- Check version selector shows correct count (e.g., "2" instead of "3")
- Verify both versions are playable

## Rollback

If needed, this migration can be rolled back:

```sql
-- No rollback needed - deleted versions were duplicates
-- Original data is preserved in tracks table
```

## Impact

- **Affected Records**: All tracks with `variant_index = 0` in `track_versions`
- **Data Loss**: None (deleted versions were duplicates)
- **Downtime**: None (migration is instant)
- **UI Impact**: Version counts will display correctly after migration

## Related Issues

- Original bug: ARCHITECTURE.md:136
- Callback fix: `supabase/functions/suno-callback/index.ts:402-443`
- Frontend fix: `src/features/tracks/components/card/useTrackCardState.ts:129-135`

## Timeline

1. ✅ Backend fix applied (2025-11-04)
2. ✅ Frontend fix applied (2025-11-04)
3. ⏳ Database migration pending (apply before next generation)
4. ⏳ Verification after migration
