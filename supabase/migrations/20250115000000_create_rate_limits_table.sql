-- Создание таблицы для rate limiting
-- Миграция: 20250115000000_create_rate_limits_table.sql

-- Создаем таблицу rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Индексы для оптимизации запросов
    CONSTRAINT rate_limits_user_endpoint_time_idx UNIQUE (user_id, endpoint, created_at)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON public.rate_limits(created_at) WHERE created_at < NOW() - INTERVAL '24 hours';

-- Включаем Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои записи rate limit
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
    FOR SELECT USING (auth.uid() = user_id);

-- Политика: система может создавать записи rate limit
CREATE POLICY "System can insert rate limits" ON public.rate_limits
    FOR INSERT WITH CHECK (true);

-- Политика: система может удалять старые записи
CREATE POLICY "System can delete old rate limits" ON public.rate_limits
    FOR DELETE USING (created_at < NOW() - INTERVAL '24 hours');

-- Создаем функцию для автоматической очистки старых записей
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.rate_limits 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Комментарии для документации
COMMENT ON TABLE public.rate_limits IS 'Таблица для отслеживания rate limiting запросов пользователей';
COMMENT ON COLUMN public.rate_limits.user_id IS 'ID пользователя, делающего запрос';
COMMENT ON COLUMN public.rate_limits.endpoint IS 'Эндпоинт API, к которому обращается пользователь';
COMMENT ON COLUMN public.rate_limits.created_at IS 'Время создания записи';
COMMENT ON COLUMN public.rate_limits.ip_address IS 'IP адрес пользователя (опционально)';
COMMENT ON COLUMN public.rate_limits.user_agent IS 'User Agent браузера (опционально)';