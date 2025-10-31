-- ============================================================
-- SECURITY FIX: Set explicit search_path for all security definer functions
-- Миграция: fix_function_search_path_security_v2
-- Дата: 2025-10-31
-- Цель: Защита от SQL injection через search_path manipulation
-- ============================================================

-- ✅ FIX 1: has_role function (используется в RLS policies)
ALTER FUNCTION public.has_role(uuid, app_role) 
SET search_path = public;

ALTER FUNCTION public.has_role(uuid, text) 
SET search_path = public;

-- ✅ FIX 2: Credits management functions
ALTER FUNCTION public.decrement_test_credits(uuid, integer) 
SET search_path = public;

ALTER FUNCTION public.decrement_production_credits(uuid, integer) 
SET search_path = public;

-- ✅ FIX 3: Engagement tracking functions
ALTER FUNCTION public.increment_view_count(uuid) 
SET search_path = public;

ALTER FUNCTION public.increment_play_count(uuid) 
SET search_path = public;

ALTER FUNCTION public.increment_download_count(uuid) 
SET search_path = public;

-- ✅ FIX 4: Notification triggers
ALTER FUNCTION public.notify_track_like() 
SET search_path = public;

ALTER FUNCTION public.notify_track_ready() 
SET search_path = public;

ALTER FUNCTION public.notify_track_liked() 
SET search_path = public;

-- ✅ FIX 5: Analytics functions
ALTER FUNCTION public.get_user_mureka_stats(uuid) 
SET search_path = public;

ALTER FUNCTION public.refresh_analytics_views() 
SET search_path = public;

ALTER FUNCTION public.get_analytics_user_stats() 
SET search_path = 'public', 'analytics';

ALTER FUNCTION public.get_analytics_generations_daily() 
SET search_path = 'public', 'analytics';

ALTER FUNCTION public.get_analytics_top_genres() 
SET search_path = 'public', 'analytics';

ALTER FUNCTION public.get_analytics_archive_statistics() 
SET search_path = 'public', 'analytics';

-- ✅ FIX 6: Track versioning functions
ALTER FUNCTION public.set_primary_variant_on_first_insert() 
SET search_path = public;

ALTER FUNCTION public.create_version_from_extended_track() 
SET search_path = public;

-- ✅ FIX 7: Archiving functions
ALTER FUNCTION public.schedule_track_archiving() 
SET search_path = public;

ALTER FUNCTION public.get_tracks_needing_archiving(integer) 
SET search_path = public;

ALTER FUNCTION public.mark_track_archived(uuid, text, text, text) 
SET search_path = public;

-- ✅ FIX 8: Update timestamp triggers
ALTER FUNCTION public.update_saved_lyrics_updated_at() 
SET search_path = public;

ALTER FUNCTION public.update_audio_library_updated_at() 
SET search_path = public;

ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public;

ALTER FUNCTION public.set_updated_at() 
SET search_path = public;

ALTER FUNCTION public.update_lyrics_jobs_updated_at() 
SET search_path = public;

-- ✅ FIX 9: User management
ALTER FUNCTION public.handle_new_user() 
SET search_path = public;

-- ✅ FIX 10: Track likes counter
ALTER FUNCTION public.update_track_likes_count() 
SET search_path = public;