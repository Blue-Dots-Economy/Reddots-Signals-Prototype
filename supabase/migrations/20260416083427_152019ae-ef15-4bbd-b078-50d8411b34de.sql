ALTER TABLE public.student_dots ADD COLUMN IF NOT EXISTS unique_id text DEFAULT NULL;
ALTER TABLE public.centre_dots ADD COLUMN IF NOT EXISTS unique_id text DEFAULT NULL;