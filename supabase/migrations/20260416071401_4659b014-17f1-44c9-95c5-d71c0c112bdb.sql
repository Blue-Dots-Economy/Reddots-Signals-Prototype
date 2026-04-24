
ALTER TABLE public.centre_dots
  ADD COLUMN IF NOT EXISTS hiring_manager_name text,
  ADD COLUMN IF NOT EXISTS called_by text,
  ADD COLUMN IF NOT EXISTS requirement_of_portal text,
  ADD COLUMN IF NOT EXISTS internship text,
  ADD COLUMN IF NOT EXISTS openings text,
  ADD COLUMN IF NOT EXISTS nature_of_job text,
  ADD COLUMN IF NOT EXISTS job_role_salary text,
  ADD COLUMN IF NOT EXISTS type_of_candidate text,
  ADD COLUMN IF NOT EXISTS min_qualification text,
  ADD COLUMN IF NOT EXISTS work_experience_years text,
  ADD COLUMN IF NOT EXISTS last_role_held text,
  ADD COLUMN IF NOT EXISTS remarks text;
