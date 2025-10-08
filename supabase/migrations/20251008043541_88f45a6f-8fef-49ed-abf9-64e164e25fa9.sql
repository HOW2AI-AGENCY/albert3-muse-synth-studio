-- Создать enum для ролей
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Создать таблицу ролей
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Включить RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Политика: админы могут видеть все роли
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Политика: админы могут управлять ролями
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Security definer функция для проверки ролей
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Назначить админа ivan.meer1990@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'ivan.meer1990@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS политики для треков: админ может видеть и удалять все треки
CREATE POLICY "Admins can view all tracks" ON public.tracks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any track" ON public.tracks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any track" ON public.tracks
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Добавить индексы для производительности
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);