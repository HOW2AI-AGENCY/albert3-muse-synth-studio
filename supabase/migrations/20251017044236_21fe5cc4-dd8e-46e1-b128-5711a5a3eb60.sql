-- Миграция: fix_analytics_events_rls_policy
-- Описание: Исправление RLS политики для analytics_events чтобы разрешить вставку с NULL user_id
-- Автор: AI Assistant  
-- Дата: 2025-10-17

-- Удаляем старую политику INSERT
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;

-- Создаем новую политику INSERT, которая разрешает:
-- 1. Вставку с user_id = auth.uid() (авторизованные пользователи)
-- 2. Вставку с user_id IS NULL (анонимная аналитика)
CREATE POLICY "Users can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );