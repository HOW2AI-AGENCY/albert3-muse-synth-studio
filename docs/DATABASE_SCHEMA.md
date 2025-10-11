# 🗄️ Схема базы данных Albert3 Muse Synth Studio

**Последнее обновление:** 2025-10-11  
**Версия схемы:** 2.7.0  
**СУБД:** PostgreSQL 15 (Supabase)

---

## 📊 Обзор

Проект использует реляционную модель данных с акцентом на безопасность (RLS), отслеживание версий треков и полную интеграцию с Suno AI API.

### Ключевые принципы:
- ✅ **Row Level Security (RLS)** на всех таблицах
- ✅ **Security Definer Functions** для избежания рекурсии
- ✅ **JSONB metadata** для гибкого хранения API-ответов
- ✅ **Timestamps** с автоматическим обновлением
- ✅ **Foreign Keys** с каскадным удалением
- ✅ **Индексы** для оптимизации запросов

---

## 📋 Таблицы

### 1. **profiles** - Профили пользователей

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Назначение**: Хранение публичной информации о пользователях  
**Связи**: 
- `id` → `auth.users.id` (один к одному)
- `tracks.user_id` → `profiles.id` (один ко многим)

**⚠️ ВАЖНО**: НЕ храните роли в этой таблице! Используйте `user_roles`.

---

### 2. **user_roles** - Роли пользователей

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Security Definer Function (предотвращает RLS рекурсию)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'));
```

**Назначение**: Управление правами доступа  
**Безопасность**: Функция `has_role` используется во всех RLS политиках для избежания рекурсии

---

### 3. **tracks** - Музыкальные треки

```sql
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Основная информация
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  improved_prompt TEXT,
  
  -- Медиа
  audio_url TEXT,
  cover_url TEXT,
  video_url TEXT,
  reference_audio_url TEXT,
  
  -- Статус и метаданные
  status TEXT NOT NULL DEFAULT 'pending', -- pending/processing/completed/failed
  progress_percent INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Suno API интеграция
  provider TEXT DEFAULT 'replicate',
  suno_id TEXT,
  model_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  
  -- Музыкальные атрибуты
  genre TEXT,
  mood TEXT,
  style_tags TEXT[],
  lyrics TEXT,
  has_vocals BOOLEAN DEFAULT false,
  has_stems BOOLEAN DEFAULT false,
  
  -- Метрики
  duration INTEGER,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  -- Публикация
  is_public BOOLEAN DEFAULT false,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at_suno TIMESTAMPTZ
);

-- Индексы для производительности
CREATE INDEX idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX idx_tracks_status ON public.tracks(status);
CREATE INDEX idx_tracks_suno_id ON public.tracks(suno_id);
CREATE INDEX idx_tracks_is_public ON public.tracks(is_public) WHERE is_public = true;
CREATE INDEX idx_tracks_created_at ON public.tracks(created_at DESC);
CREATE INDEX idx_tracks_play_count ON public.tracks(play_count DESC);

-- RLS Policies
CREATE POLICY "Users can view their own tracks"
  ON public.tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public tracks are viewable by everyone"
  ON public.tracks FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Admins can view all tracks"
  ON public.tracks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can CRUD their own tracks"
  ON public.tracks FOR ALL
  USING (auth.uid() = user_id);
```

**Metadata структура** (JSONB):
```typescript
{
  // Suno API response
  suno_data?: {
    id: string;
    audioUrl: string;
    imageUrl: string;
    videoUrl?: string;
    title: string;
    tags: string;
    prompt: string;
    duration: number;
    created: string;
    model_name: string;
  }[];
  
  // Extend/Cover tracking
  extended_from?: string; // UUID родительского трека
  is_cover?: boolean;
  reference_track_id?: string;
  
  // Suno polling
  suno_last_poll_at?: string; // ISO timestamp
  suno_last_poll_response?: object;
  suno_generation_endpoint?: string;
}
```

---

### 4. **track_versions** - Версии треков

```sql
CREATE TABLE public.track_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  is_master BOOLEAN DEFAULT false,
  
  -- Медиа
  audio_url TEXT,
  cover_url TEXT,
  video_url TEXT,
  
  -- Атрибуты
  lyrics TEXT,
  duration INTEGER,
  suno_id TEXT,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(parent_track_id, version_number)
);

-- RLS Policies
CREATE POLICY "Users can view versions of their own tracks"
  ON public.track_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = track_versions.parent_track_id
        AND tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view versions of public tracks"
  ON public.track_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = track_versions.parent_track_id
        AND tracks.is_public = true
    )
  );
```

**Назначение**: Хранение альтернативных версий треков (extend, cover, remixes)

---

### 5. **track_stems** - Stem-разделения

```sql
CREATE TABLE public.track_stems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.track_versions(id) ON DELETE CASCADE,
  
  -- Тип стема
  stem_type TEXT NOT NULL, -- vocals/instrumental/drums/bass/etc.
  separation_mode TEXT NOT NULL, -- separate_vocal/split_stem
  
  -- Медиа
  audio_url TEXT NOT NULL,
  
  -- Suno интеграция
  suno_task_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_track_stems_track_id ON public.track_stems(track_id);
CREATE INDEX idx_track_stems_version_id ON public.track_stems(version_id);

-- RLS Policies
CREATE POLICY "Users can view stems of their own tracks"
  ON public.track_stems FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = track_stems.track_id
        AND tracks.user_id = auth.uid()
    )
  );
```

**Типы стемов**:
- `separate_vocal`: `vocals`, `instrumental`
- `split_stem`: `vocals`, `backing_vocals`, `drums`, `bass`, `guitar`, `keyboard`, `strings`, `brass`, `woodwinds`, `percussion`, `synth`, `fx`

---

### 6. **track_likes** - Лайки треков

```sql
CREATE TABLE public.track_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, track_id)
);

-- Trigger для автоматического обновления счётчика
CREATE OR REPLACE FUNCTION public.update_track_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks SET like_count = like_count + 1 WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks SET like_count = like_count - 1 WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_likes_count
  AFTER INSERT OR DELETE ON public.track_likes
  FOR EACH ROW EXECUTE FUNCTION update_track_likes_count();
```

---

### 7. **lyrics_jobs** - Задачи генерации текстов

```sql
CREATE TABLE public.lyrics_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  
  -- Параметры запроса
  prompt TEXT NOT NULL,
  request_payload JSONB,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending', -- pending/processing/completed/failed
  error_message TEXT,
  
  -- Suno интеграция
  suno_task_id TEXT,
  call_strategy TEXT DEFAULT 'callback',
  callback_url TEXT,
  
  -- Ответы API
  initial_response JSONB,
  last_poll_response JSONB,
  last_callback JSONB,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update trigger
CREATE TRIGGER update_lyrics_jobs_updated_at
  BEFORE UPDATE ON public.lyrics_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

### 8. **lyrics_variants** - Варианты текстов

```sql
CREATE TABLE public.lyrics_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.lyrics_jobs(id) ON DELETE CASCADE,
  variant_index INTEGER NOT NULL,
  
  -- Контент
  title TEXT,
  content TEXT,
  
  -- Статус
  status TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Назначение**: Хранение множественных вариантов текстов (Suno возвращает 3-5 вариантов)

---

### 9. **notifications** - Уведомления

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Контент
  type TEXT NOT NULL, -- track/like/error/system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  
  -- Статус
  read BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого получения непрочитанных
CREATE INDEX idx_notifications_user_read 
  ON public.notifications(user_id, read) 
  WHERE read = false;

-- RLS
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
```

---

### 10. **app_settings** - Глобальные настройки

```sql
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
CREATE POLICY "Authenticated users can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));
```

**Примеры ключей**:
- `credit_mode`: `{ "mode": "test" | "production" }`
- `maintenance_mode`: `{ "enabled": boolean }`

---

### 11. **callback_logs** - Логи webhook callbacks

```sql
CREATE TABLE public.callback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  
  -- Метаданные
  callback_type TEXT NOT NULL, -- music/lyrics/stems
  payload JSONB,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
CREATE POLICY "System can insert callback logs"
  ON public.callback_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view logs for their tracks"
  ON public.callback_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = callback_logs.track_id
        AND tracks.user_id = auth.uid()
    )
  );
```

---

### 12. **track_retry_attempts** - Попытки повторной генерации

```sql
CREATE TABLE public.track_retry_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 Триггеры и функции

### 1. **Автоматическое обновление updated_at**

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Применить к таблицам
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. **Создание версий из extended треков**

```sql
CREATE OR REPLACE FUNCTION public.create_version_from_extended_track()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
  next_version_num INTEGER;
BEGIN
  IF NEW.metadata IS NOT NULL AND 
     (NEW.metadata ? 'extended_from' OR NEW.metadata ? 'is_cover') AND
     NEW.status = 'completed' AND
     NEW.audio_url IS NOT NULL THEN
    
    parent_id := COALESCE(
      (NEW.metadata->>'extended_from')::UUID,
      (NEW.metadata->>'reference_track_id')::UUID
    );
    
    IF parent_id IS NOT NULL THEN
      SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version_num
      FROM track_versions WHERE parent_track_id = parent_id;
      
      INSERT INTO track_versions (
        parent_track_id, version_number, is_master,
        audio_url, cover_url, video_url, duration, lyrics, suno_id, metadata
      )
      VALUES (
        parent_id, next_version_num, false,
        NEW.audio_url, NEW.cover_url, NEW.video_url,
        COALESCE(NEW.duration, NEW.duration_seconds),
        NEW.lyrics, NEW.suno_id,
        jsonb_build_object(
          'source', CASE 
            WHEN NEW.metadata ? 'extended_from' THEN 'extend'
            WHEN NEW.metadata ? 'is_cover' THEN 'cover'
            ELSE 'unknown'
          END,
          'original_track_id', NEW.id
        )
      )
      ON CONFLICT (parent_track_id, version_number) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_create_version
  AFTER UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION create_version_from_extended_track();
```

---

### 3. **Уведомления о лайках**

```sql
CREATE OR REPLACE FUNCTION public.notify_track_liked()
RETURNS TRIGGER AS $$
DECLARE
  track_owner_id uuid;
  track_title text;
  liker_name text;
BEGIN
  SELECT user_id, title INTO track_owner_id, track_title
  FROM public.tracks WHERE id = NEW.track_id;

  SELECT full_name INTO liker_name
  FROM public.profiles WHERE id = NEW.user_id;

  IF track_owner_id IS NOT NULL AND track_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      track_owner_id,
      'like',
      'Новый лайк',
      COALESCE(liker_name, 'Пользователь') || ' оценил ваш трек "' || track_title || '"',
      '/workspace/library?track=' || NEW.track_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_track_like
  AFTER INSERT ON public.track_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_track_liked();
```

---

### 4. **Инкременты счётчиков**

```sql
-- Прослушивания
CREATE OR REPLACE FUNCTION public.increment_play_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Просмотры
CREATE OR REPLACE FUNCTION public.increment_view_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracks 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Скачивания
CREATE OR REPLACE FUNCTION public.increment_download_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracks 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = track_id;
END;
$$;
```

---

## 🗂️ Storage Buckets

### 1. **tracks-audio**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tracks-audio', 'tracks-audio', true);

-- RLS для загрузки
CREATE POLICY "Users can upload their own tracks"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tracks-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 2. **tracks-covers**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tracks-covers', 'tracks-covers', true);
```

### 3. **tracks-videos**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tracks-videos', 'tracks-videos', true);
```

### 4. **reference-audio**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reference-audio', 'reference-audio', true);

-- RLS для загрузки референсов
CREATE POLICY "Users can upload reference audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reference-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 📈 Оптимизация запросов

### Часто используемые запросы

**1. Получить треки пользователя с лайками**:
```sql
SELECT 
  t.*,
  EXISTS(
    SELECT 1 FROM track_likes 
    WHERE track_id = t.id AND user_id = auth.uid()
  ) as is_liked
FROM tracks t
WHERE t.user_id = auth.uid()
ORDER BY t.created_at DESC;
```

**2. Топ публичных треков**:
```sql
SELECT *
FROM tracks
WHERE is_public = true AND status = 'completed'
ORDER BY play_count DESC, like_count DESC
LIMIT 20;
```

**3. Статистика за период**:
```sql
SELECT 
  COUNT(*) as total_tracks,
  SUM(play_count) as total_plays,
  SUM(like_count) as total_likes,
  SUM(view_count) as total_views
FROM tracks
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## 🔒 Безопасность - Чеклист

- ✅ RLS включён на всех таблицах
- ✅ Security Definer функции для избежания рекурсии
- ✅ Роли хранятся в отдельной таблице `user_roles`
- ✅ Foreign Keys с каскадным удалением
- ✅ Индексы для производительности
- ✅ Валидация на уровне БД (NOT NULL, UNIQUE, CHECK)
- ✅ Автоматические триггеры для целостности данных
- ✅ Storage RLS для медиа-файлов

---

## 📞 Связанные документы

- [SUNO_API_COMPLETE_REFERENCE.md](./integrations/SUNO_API_COMPLETE_REFERENCE.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURITY_AUDIT_2025.md](../reports/security/SECURITY_AUDIT_2025.md)

---

**Версия:** 2.7.0  
**Дата:** 2025-10-11  
**Статус:** Актуально
