
CREATE UNIQUE INDEX IF NOT EXISTS student_dots_email_unique ON public.student_dots (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tutor_dots_email_unique ON public.tutor_dots (email) WHERE email IS NOT NULL;
