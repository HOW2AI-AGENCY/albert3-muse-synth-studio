-- Remove mureka_task_id column from tracks table
ALTER TABLE public.tracks DROP COLUMN IF EXISTS mureka_task_id;
