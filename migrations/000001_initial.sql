CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF to_regclass('public.muscles') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'muscles'
             AND column_name = 'user_id'
       ) THEN
        IF to_regclass('public.workout_sets') IS NOT NULL THEN
            ALTER TABLE public.workout_sets RENAME TO legacy_workout_sets;
        END IF;
        IF to_regclass('public.workouts') IS NOT NULL THEN
            ALTER TABLE public.workouts RENAME TO legacy_workouts;
        END IF;
        ALTER TABLE public.muscles RENAME TO legacy_muscles;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_users_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_users_email_not_blank CHECK (length(btrim(email)) > 0),
    CONSTRAINT gymtrack_users_display_name_not_blank CHECK (length(btrim(display_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS gymtrack_users_email_lower_uidx
    ON public.users (lower(email));

CREATE TABLE IF NOT EXISTS public.refresh_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash bytea NOT NULL,
    rotated_from_id uuid NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    last_used_at timestamptz NULL,
    CONSTRAINT gymtrack_refresh_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_refresh_sessions_user_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_refresh_sessions_rotated_from_fkey
        FOREIGN KEY (rotated_from_id) REFERENCES public.refresh_sessions(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS gymtrack_refresh_sessions_token_hash_uidx
    ON public.refresh_sessions (token_hash);
CREATE INDEX IF NOT EXISTS gymtrack_refresh_sessions_user_idx
    ON public.refresh_sessions (user_id);
CREATE INDEX IF NOT EXISTS gymtrack_refresh_sessions_family_idx
    ON public.refresh_sessions (family_id);

CREATE TABLE IF NOT EXISTS public.muscles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    position integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_muscles_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_muscles_user_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_muscles_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT gymtrack_muscles_position_check CHECK (position >= 0),
    CONSTRAINT gymtrack_muscles_user_id_id_unique UNIQUE (user_id, id),
    CONSTRAINT gymtrack_muscles_user_position_unique UNIQUE (user_id, position)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS public.exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    muscle_id uuid NOT NULL,
    name text NOT NULL,
    position integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_exercises_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_exercises_owner_fkey
        FOREIGN KEY (user_id, muscle_id) REFERENCES public.muscles(user_id, id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_exercises_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT gymtrack_exercises_position_check CHECK (position >= 0),
    CONSTRAINT gymtrack_exercises_user_id_id_unique UNIQUE (user_id, id),
    CONSTRAINT gymtrack_exercises_muscle_position_unique UNIQUE (muscle_id, position)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS gymtrack_exercises_user_idx
    ON public.exercises (user_id);

CREATE TABLE IF NOT EXISTS public.exercise_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    position integer NOT NULL,
    target_reps integer NOT NULL,
    target_weight numeric(8, 2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_exercise_sets_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_exercise_sets_owner_fkey
        FOREIGN KEY (user_id, exercise_id) REFERENCES public.exercises(user_id, id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_exercise_sets_position_check CHECK (position >= 0),
    CONSTRAINT gymtrack_exercise_sets_reps_check CHECK (target_reps >= 0),
    CONSTRAINT gymtrack_exercise_sets_weight_check CHECK (target_weight >= 0),
    CONSTRAINT gymtrack_exercise_sets_user_id_id_unique UNIQUE (user_id, id),
    CONSTRAINT gymtrack_exercise_sets_exercise_position_unique UNIQUE (exercise_id, position)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS gymtrack_exercise_sets_user_idx
    ON public.exercise_sets (user_id);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    muscle_id uuid NULL,
    muscle_name text NOT NULL,
    status text NOT NULL,
    started_at timestamptz DEFAULT now() NOT NULL,
    completed_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_workout_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_workout_sessions_user_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_workout_sessions_muscle_fkey
        FOREIGN KEY (muscle_id) REFERENCES public.muscles(id) ON DELETE SET NULL,
    CONSTRAINT gymtrack_workout_sessions_status_check
        CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS gymtrack_workout_sessions_active_uidx
    ON public.workout_sessions (user_id, muscle_id)
    WHERE status = 'active' AND muscle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gymtrack_workout_sessions_history_idx
    ON public.workout_sessions (user_id, completed_at DESC)
    WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS public.workout_session_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    exercise_id uuid NULL,
    exercise_set_id uuid NULL,
    exercise_name text NOT NULL,
    exercise_position integer NOT NULL,
    set_number integer NOT NULL,
    reps integer NOT NULL,
    weight numeric(8, 2) NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT gymtrack_workout_session_sets_pkey PRIMARY KEY (id),
    CONSTRAINT gymtrack_workout_session_sets_session_fkey
        FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_workout_session_sets_user_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT gymtrack_workout_session_sets_exercise_fkey
        FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE SET NULL,
    CONSTRAINT gymtrack_workout_session_sets_exercise_set_fkey
        FOREIGN KEY (exercise_set_id) REFERENCES public.exercise_sets(id) ON DELETE SET NULL,
    CONSTRAINT gymtrack_workout_session_sets_exercise_position_check CHECK (exercise_position >= 0),
    CONSTRAINT gymtrack_workout_session_sets_set_number_check CHECK (set_number > 0),
    CONSTRAINT gymtrack_workout_session_sets_reps_check CHECK (reps >= 0),
    CONSTRAINT gymtrack_workout_session_sets_weight_check CHECK (weight >= 0)
);

CREATE INDEX IF NOT EXISTS gymtrack_workout_session_sets_session_idx
    ON public.workout_session_sets (session_id, exercise_position, set_number);
CREATE INDEX IF NOT EXISTS gymtrack_workout_session_sets_history_idx
    ON public.workout_session_sets (user_id, exercise_set_id, completed_at DESC)
    WHERE completed = true;
