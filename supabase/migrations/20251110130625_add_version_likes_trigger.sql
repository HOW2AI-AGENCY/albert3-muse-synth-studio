-- Migration: Add trigger for track_version_likes to update like_count
-- Date: 2025-11-10
-- Purpose: Automatically update track_versions.like_count when likes are added/removed
--
-- Context:
-- - track_versions.like_count was added in migration 20251108052328
-- - Function update_track_version_like_count() was created but NOT connected to trigger
-- - This migration completes the implementation by adding the trigger
--
-- Expected behavior:
-- - INSERT into track_version_likes → increment like_count
-- - DELETE from track_version_likes → decrement like_count

BEGIN;

-- Step 1: Ensure the function exists (idempotent)
CREATE OR REPLACE FUNCTION public.update_track_version_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like_count for the variant
    UPDATE track_versions
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.version_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like_count for the variant
    UPDATE track_versions
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.version_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Step 2: Create the trigger (if table exists)
DO $$
BEGIN
  -- Check if track_version_likes table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'track_version_likes'
  ) THEN
    -- Drop existing trigger if any
    DROP TRIGGER IF EXISTS update_version_likes_count ON public.track_version_likes;

    -- Create new trigger
    CREATE TRIGGER update_version_likes_count
      AFTER INSERT OR DELETE ON public.track_version_likes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_track_version_like_count();

    RAISE NOTICE 'Trigger update_version_likes_count created successfully';
  ELSE
    RAISE NOTICE 'Table track_version_likes does not exist yet - trigger will be added when table is created';
  END IF;
END $$;

-- Step 3: Add comments
COMMENT ON FUNCTION public.update_track_version_like_count() IS
  'Automatically updates track_versions.like_count when likes are added/removed from track_version_likes table';

COMMIT;

-- Verification query (commented out - for manual testing):
-- Test by inserting/deleting a like and checking like_count:
-- SELECT id, like_count FROM track_versions WHERE id = 'some-variant-id';
-- INSERT INTO track_version_likes (user_id, version_id) VALUES (auth.uid(), 'some-variant-id');
-- SELECT id, like_count FROM track_versions WHERE id = 'some-variant-id'; -- should be +1
-- DELETE FROM track_version_likes WHERE version_id = 'some-variant-id' AND user_id = auth.uid();
-- SELECT id, like_count FROM track_versions WHERE id = 'some-variant-id'; -- should be back to original
