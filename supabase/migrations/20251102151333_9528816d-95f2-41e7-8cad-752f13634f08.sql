-- Удаление неиспользуемых таблиц Studio
DROP TABLE IF EXISTS public.studio_project_tracks CASCADE;
DROP TABLE IF EXISTS public.studio_projects CASCADE;

-- Удаление неиспользуемой функции
DROP FUNCTION IF EXISTS public.update_studio_project_updated_at() CASCADE;