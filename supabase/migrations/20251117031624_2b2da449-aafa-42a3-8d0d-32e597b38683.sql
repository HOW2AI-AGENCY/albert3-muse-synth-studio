-- ============================================
-- SUBSCRIPTION SYSTEM - Complete Migration
-- Version: 1.0.0
-- Created: 2025-11-17
-- ============================================

-- 1. Update profiles table with subscription columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS credits_used_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_credit_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for profiles subscription fields
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;

-- 2. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2),
  price_annual NUMERIC(10,2),
  credits_monthly INTEGER NOT NULL DEFAULT 10,
  credits_daily_limit INTEGER,
  max_projects INTEGER,
  max_concurrent_generations INTEGER DEFAULT 1,
  max_reference_audios INTEGER DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active) WHERE is_active = true;

-- RLS for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Create generation_limits table
CREATE TABLE IF NOT EXISTS public.generation_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  generations_used_today INTEGER DEFAULT 0,
  generations_limit_daily INTEGER,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for generation_limits
CREATE INDEX IF NOT EXISTS idx_generation_limits_user_id ON public.generation_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_limits_reset ON public.generation_limits(last_reset_at);

-- RLS for generation_limits
ALTER TABLE public.generation_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own limits" ON public.generation_limits;
CREATE POLICY "Users can view own limits"
  ON public.generation_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage limits" ON public.generation_limits;
CREATE POLICY "System can manage limits"
  ON public.generation_limits FOR ALL
  USING (true);

-- 4. Create functions
CREATE OR REPLACE FUNCTION public.reset_daily_generation_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.generation_limits
  SET 
    generations_used_today = 0,
    last_reset_at = NOW()
  WHERE last_reset_at < NOW() - INTERVAL '1 day';
  
  UPDATE public.profiles
  SET 
    credits_used_today = 0,
    last_credit_reset_at = NOW()
  WHERE last_credit_reset_at < NOW() - INTERVAL '1 day';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_generation_limit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _limit INTEGER;
  _used INTEGER;
  _plan TEXT;
BEGIN
  SELECT subscription_plan INTO _plan
  FROM public.profiles
  WHERE id = _user_id;
  
  SELECT 
    generations_limit_daily,
    generations_used_today
  INTO _limit, _used
  FROM public.generation_limits
  WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.generation_limits (user_id, plan_name, generations_limit_daily)
    SELECT _user_id, _plan, credits_daily_limit
    FROM public.subscription_plans
    WHERE name = _plan;
    
    RETURN true;
  END IF;
  
  IF _limit IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN _used < _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_generation_usage(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.generation_limits
  SET generations_used_today = generations_used_today + 1
  WHERE user_id = _user_id;
  
  UPDATE public.profiles
  SET credits_used_today = credits_used_today + 1
  WHERE id = _user_id;
END;
$$;

-- 5. Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_generation_limits_updated_at ON public.generation_limits;
CREATE TRIGGER update_generation_limits_updated_at
  BEFORE UPDATE ON public.generation_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Insert default subscription plans
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_annual, credits_monthly, credits_daily_limit, max_projects, max_concurrent_generations, max_reference_audios, features)
VALUES
  ('free', 'Free Plan', 'Базовый план для начинающих', 0, 0, 10, 3, 2, 1, 0, 
   '["simple_mode", "basic_generation", "lyrics_editor"]'::jsonb),
  
  ('pro', 'Pro Plan', 'Профессиональный план для музыкантов', 19.99, 199.99, 100, 20, 10, 3, 3,
   '["simple_mode", "pro_mode", "ai_field_actions", "reference_audio", "daw_light", "stems", "lyrics_ai_tools"]'::jsonb),
  
  ('studio', 'Studio Plan', 'План для студий и продюсеров', 49.99, 499.99, 500, 100, 50, 10, 10,
   '["simple_mode", "pro_mode", "creative_director", "ai_context", "reference_audio", "daw_advanced", "stems", "lyrics_drag_drop", "multi_reference", "project_templates", "wav_export", "midi_export"]'::jsonb),
  
  ('enterprise', 'Enterprise Plan', 'Корпоративный план с поддержкой', 199.99, 1999.99, 9999, NULL, NULL, 20, 20,
   '["all_features", "collaboration", "admin_panel", "priority_support", "custom_workflows", "team_management"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 7. Migrate existing users
UPDATE public.profiles
SET 
  subscription_plan = COALESCE(subscription_tier, 'free'),
  subscription_status = 'active',
  credits_remaining = 10
WHERE subscription_plan IS NULL;

-- 8. Create generation_limits for existing users
INSERT INTO public.generation_limits (user_id, plan_name, generations_limit_daily)
SELECT 
  p.id,
  p.subscription_plan,
  sp.credits_daily_limit
FROM public.profiles p
JOIN public.subscription_plans sp ON sp.name = p.subscription_plan
ON CONFLICT (user_id) DO NOTHING;

-- 9. AI Context System - Add columns to music_projects
ALTER TABLE public.music_projects
ADD COLUMN IF NOT EXISTS ai_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_context_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ai_context_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for AI context
CREATE INDEX IF NOT EXISTS idx_music_projects_ai_context ON public.music_projects USING GIN(ai_context);

-- 10. Create AI context functions
CREATE OR REPLACE FUNCTION public.update_project_ai_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _context JSONB;
  _tracks_data JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'title', t.title,
      'genre', t.genre,
      'mood', t.mood,
      'style_tags', t.style_tags
    )
  ) INTO _tracks_data
  FROM project_tracks pt
  JOIN tracks t ON t.id = pt.track_id
  WHERE pt.project_id = NEW.id
    AND t.status = 'completed'
  LIMIT 10;

  _context := jsonb_build_object(
    'project', jsonb_build_object(
      'id', NEW.id,
      'type', NEW.project_type,
      'genre', NEW.genre,
      'mood', NEW.mood,
      'concept', NEW.description,
      'story_theme', NEW.story_theme,
      'style_tags', NEW.style_tags
    ),
    'tracks', COALESCE(_tracks_data, '[]'::jsonb),
    'updated_at', NOW()
  );

  NEW.ai_context := _context;
  NEW.ai_context_updated_at := NOW();
  NEW.ai_context_version := COALESCE(OLD.ai_context_version, 0) + 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_project_ai_context ON public.music_projects;
CREATE TRIGGER trigger_update_project_ai_context
  BEFORE INSERT OR UPDATE ON public.music_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_ai_context();

CREATE OR REPLACE FUNCTION public.get_track_ai_context(_track_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _context JSONB;
  _project_id UUID;
  _track_data JSONB;
BEGIN
  SELECT project_id INTO _project_id
  FROM tracks
  WHERE id = _track_id;

  IF _project_id IS NOT NULL THEN
    SELECT ai_context INTO _context
    FROM music_projects
    WHERE id = _project_id;
  ELSE
    _context := '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'track', jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'prompt', t.prompt,
      'lyrics', t.lyrics,
      'genre', t.genre,
      'mood', t.mood,
      'style_tags', t.style_tags,
      'provider', t.provider
    )
  ) INTO _track_data
  FROM tracks t
  WHERE t.id = _track_id;

  RETURN _context || _track_data;
END;
$$;

-- 11. Comments for documentation
COMMENT ON TABLE public.subscription_plans IS 'Subscription plans with features and pricing';
COMMENT ON TABLE public.generation_limits IS 'Daily generation limits per user';
COMMENT ON FUNCTION public.reset_daily_generation_limits() IS 'Reset daily limits (call via cron)';
COMMENT ON FUNCTION public.check_generation_limit(_user_id UUID) IS 'Check if user can generate';
COMMENT ON FUNCTION public.increment_generation_usage(_user_id UUID) IS 'Increment generation usage counter';
COMMENT ON FUNCTION public.get_track_ai_context(_track_id UUID) IS 'Get full AI context for track (project + track data)';