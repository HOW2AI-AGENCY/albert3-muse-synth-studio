-- Add mureka_task_id column to tracks table for Mureka AI tracking
-- This allows us to track both Suno and Mureka generations separately

ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS mureka_task_id TEXT;

-- Add index for faster queries by mureka_task_id
CREATE INDEX IF NOT EXISTS idx_tracks_mureka_task_id 
ON public.tracks(mureka_task_id) 
WHERE mureka_task_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.tracks.mureka_task_id IS 'Task ID from Mureka API for tracking generation status';