DO $$
DECLARE
    table_name text;
    api_role text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'schema_migrations',
        'users',
        'refresh_sessions',
        'muscles',
        'exercises',
        'exercise_sets',
        'workout_sessions',
        'workout_session_sets',
        'legacy_muscles',
        'legacy_workouts',
        'legacy_workout_sets'
    ] LOOP
        IF to_regclass(format('public.%I', table_name)) IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
            table_name
        );

        FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
                EXECUTE format(
                    'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
                    table_name,
                    api_role
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;
