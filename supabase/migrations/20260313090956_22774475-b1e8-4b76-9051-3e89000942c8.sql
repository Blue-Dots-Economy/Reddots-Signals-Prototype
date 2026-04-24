
-- Add 'pending' and 'rejected' to outreach_status enum
ALTER TYPE public.outreach_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.outreach_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add target_user_id to outreach table (nullable for now, will be required when real data comes)
ALTER TABLE public.outreach ADD COLUMN IF NOT EXISTS target_user_id UUID DEFAULT NULL;

-- RLS: Students can see outreach records targeting them
CREATE POLICY "Students can view outreach targeting them"
ON public.outreach
FOR SELECT
TO authenticated
USING (auth.uid() = target_user_id);

-- RLS: Students can update outreach status when they are the target (approve/reject)
CREATE POLICY "Students can update outreach targeting them"
ON public.outreach
FOR UPDATE
TO authenticated
USING (auth.uid() = target_user_id)
WITH CHECK (auth.uid() = target_user_id);
