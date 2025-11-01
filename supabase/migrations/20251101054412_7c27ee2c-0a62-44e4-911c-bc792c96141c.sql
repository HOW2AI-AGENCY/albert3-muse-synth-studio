-- Исправление security warning: используем CASCADE для пересоздания функции
DROP FUNCTION IF EXISTS public.update_suno_personas_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_suno_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Пересоздаем триггер
CREATE TRIGGER trigger_update_suno_personas_updated_at
  BEFORE UPDATE ON public.suno_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_suno_personas_updated_at();