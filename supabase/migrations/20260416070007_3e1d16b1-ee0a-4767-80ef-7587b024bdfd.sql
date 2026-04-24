
ALTER TABLE public.student_dots
  ADD COLUMN IF NOT EXISTS school_iti text,
  ADD COLUMN IF NOT EXISTS mobile_device text,
  ADD COLUMN IF NOT EXISTS age text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS work_experience text,
  ADD COLUMN IF NOT EXISTS highest_qualification text,
  ADD COLUMN IF NOT EXISTS last_role text,
  ADD COLUMN IF NOT EXISTS jobs_interested_nature text,
  ADD COLUMN IF NOT EXISTS jobs_interested_role text,
  ADD COLUMN IF NOT EXISTS other_help text;
