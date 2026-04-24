
-- Add target_user_id column to tutor_outreach
ALTER TABLE public.tutor_outreach ADD COLUMN target_user_id uuid;

-- Allow tutors to see incoming student requests targeting them
CREATE POLICY "Tutors can view outreach targeting them"
ON public.tutor_outreach FOR SELECT
TO authenticated
USING (auth.uid() = target_user_id);

-- Allow tutors to update outreach targeting them (approve/reject)
CREATE POLICY "Tutors can update outreach targeting them"
ON public.tutor_outreach FOR UPDATE
TO authenticated
USING (auth.uid() = target_user_id)
WITH CHECK (auth.uid() = target_user_id);
