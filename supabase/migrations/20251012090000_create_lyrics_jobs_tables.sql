CREATE TABLE public.lyrics_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  track_id uuid REFERENCES public.tracks(id),
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  suno_task_id text,
  call_strategy text NOT NULL DEFAULT 'callback',
  callback_url text,
  metadata jsonb,
  request_payload jsonb,
  initial_response jsonb,
  last_callback jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lyrics_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.lyrics_jobs(id) ON DELETE CASCADE,
  variant_index integer NOT NULL,
  title text,
  status text,
  content text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX lyrics_variants_job_id_variant_index_idx
  ON public.lyrics_variants(job_id, variant_index);

ALTER TABLE public.lyrics_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lyrics_jobs_select_policy" ON public.lyrics_jobs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "lyrics_variants_select_policy" ON public.lyrics_variants
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.lyrics_jobs lj
    WHERE lj.id = lyrics_variants.job_id
      AND lj.user_id = auth.uid()
  ));
