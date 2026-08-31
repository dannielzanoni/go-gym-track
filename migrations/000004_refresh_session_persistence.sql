ALTER TABLE public.refresh_sessions
    ADD COLUMN IF NOT EXISTS persistent boolean DEFAULT true NOT NULL;
