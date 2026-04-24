
-- Create outreach status enum
CREATE TYPE public.outreach_status AS ENUM ('invited', 'responded', 'session_booked', 'completed');

-- Create outreach table
CREATE TABLE public.outreach (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dot_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_area TEXT NOT NULL,
  student_category TEXT NOT NULL,
  student_needs TEXT,
  student_grade TEXT,
  student_icon TEXT,
  status outreach_status NOT NULL DEFAULT 'invited',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outreach ENABLE ROW LEVEL SECURITY;

-- Users can only see their own outreach records
CREATE POLICY "Users can view own outreach" ON public.outreach
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own outreach records
CREATE POLICY "Users can insert own outreach" ON public.outreach
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own outreach records
CREATE POLICY "Users can update own outreach" ON public.outreach
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own outreach records
CREATE POLICY "Users can delete own outreach" ON public.outreach
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
