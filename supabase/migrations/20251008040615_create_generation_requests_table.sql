CREATE TABLE "public"."generation_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_id" uuid,
    "track_id" uuid,
    "provider" text,
    "status" text,
    "request_payload" jsonb,
    "response_payload" jsonb,
    "error_message" text
);

ALTER TABLE "public"."generation_requests" OWNER TO "postgres";

CREATE SEQUENCE "public"."generation_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."generation_requests_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."generation_requests_id_seq" OWNED BY "public"."generation_requests"."id";

ALTER TABLE ONLY "public"."generation_requests" ALTER COLUMN "id" SET DEFAULT nextval('public.generation_requests_id_seq'::regclass);

ALTER TABLE ONLY "public"."generation_requests"
    ADD CONSTRAINT "generation_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."generation_requests"
    ADD CONSTRAINT "generation_requests_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."generation_requests"
    ADD CONSTRAINT "generation_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX ix_generation_requests_user_id ON public.generation_requests USING btree (user_id);
CREATE INDEX ix_generation_requests_track_id ON public.generation_requests USING btree (track_id);
CREATE INDEX ix_generation_requests_status ON public.generation_requests USING btree (status);
CREATE INDEX ix_generation_requests_provider ON public.generation_requests USING btree (provider);

-- Enable RLS
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own generation requests" ON public.generation_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own generation requests" ON public.generation_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all generation requests" ON public.generation_requests FOR ALL USING (public.is_admin(auth.uid()));