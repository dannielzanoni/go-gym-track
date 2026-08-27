CREATE TABLE IF NOT EXISTS public.cardio_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    duration_minutes integer NOT NULL,
    distance_km numeric(8, 2) NOT NULL,
    calories integer NOT NULL,
    occurred_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_cardio_records_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_cardio_records_user_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_cardio_records_type_check
        CHECK (activity_type IN ('treadmill', 'bike', 'football')),
    CONSTRAINT gymtrack_cardio_records_duration_check CHECK (duration_minutes > 0),
    CONSTRAINT gymtrack_cardio_records_distance_check CHECK (distance_km >= 0),
    CONSTRAINT gymtrack_cardio_records_calories_check CHECK (calories >= 0)
);

CREATE INDEX IF NOT EXISTS gymtrack_cardio_records_user_date_idx
    ON public.cardio_records (user_id, occurred_at DESC);

ALTER TABLE public.cardio_records ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    api_role text;
BEGIN
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON TABLE public.cardio_records FROM %I',
                api_role
            );
        END IF;
    END LOOP;
END $$;
