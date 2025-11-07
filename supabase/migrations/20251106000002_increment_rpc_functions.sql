-- Migration: Atomic Increment Functions (PERF-001)
-- Created: 2025-11-06
-- Purpose: Eliminate N+1 queries for play_count and like_count updates

-- =====================================================
-- 1. INCREMENT PLAY COUNT (Atomic Operation)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_play_count(
  p_track_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Atomic update without read-then-write
  UPDATE tracks
  SET
    play_count = COALESCE(play_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_track_id;

  -- Log if track not found (for debugging)
  IF NOT FOUND THEN
    RAISE NOTICE 'Track not found: %', p_track_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. INCREMENT LIKE COUNT (Atomic Operation)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_like_count(
  p_track_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE tracks
  SET
    like_count = COALESCE(like_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Track not found: %', p_track_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. DECREMENT LIKE COUNT (For Unlike)
-- =====================================================

CREATE OR REPLACE FUNCTION decrement_like_count(
  p_track_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE tracks
  SET
    like_count = GREATEST(COALESCE(like_count, 0) - 1, 0),
    updated_at = NOW()
  WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Track not found: %', p_track_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. BATCH INCREMENT (Optional - for future use)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_play_counts(
  p_track_ids UUID[]
) RETURNS INT AS $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE tracks
  SET
    play_count = COALESCE(play_count, 0) + 1,
    updated_at = NOW()
  WHERE id = ANY(p_track_ids);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION increment_play_count IS
  'Atomically increments play_count for a track (eliminates N+1 query pattern)';

COMMENT ON FUNCTION increment_like_count IS
  'Atomically increments like_count for a track (eliminates N+1 query pattern)';

COMMENT ON FUNCTION decrement_like_count IS
  'Atomically decrements like_count for a track (prevents negative values)';

COMMENT ON FUNCTION increment_play_counts IS
  'Batch increment play counts for multiple tracks (future optimization)';

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant execute to service_role (Edge Functions)
GRANT EXECUTE ON FUNCTION increment_play_count TO service_role;
GRANT EXECUTE ON FUNCTION increment_like_count TO service_role;
GRANT EXECUTE ON FUNCTION decrement_like_count TO service_role;
GRANT EXECUTE ON FUNCTION increment_play_counts TO service_role;

-- Grant execute to authenticated users (client-side calls)
GRANT EXECUTE ON FUNCTION increment_play_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_like_count TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_like_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_play_counts TO authenticated;

-- =====================================================
-- 7. PERFORMANCE NOTES
-- =====================================================

-- BEFORE (N+1 Pattern):
-- Query 1: SELECT * FROM tracks WHERE id = 'xxx'  (50-100ms)
-- Query 2: UPDATE tracks SET play_count = N+1     (50-100ms)
-- Total: ~100-200ms, 2 round-trips

-- AFTER (Atomic RPC):
-- Query 1: SELECT increment_play_count('xxx')     (50-100ms)
-- Total: ~50-100ms, 1 round-trip
-- Improvement: 50% faster, 50% less DB load
