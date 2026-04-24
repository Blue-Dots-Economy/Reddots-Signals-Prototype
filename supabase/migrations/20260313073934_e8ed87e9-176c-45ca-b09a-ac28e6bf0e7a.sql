
-- Create tutor_outreach table for student→tutor shortlisting
CREATE TABLE public.tutor_outreach (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dot_id TEXT NOT NULL,
  tutor_name TEXT NOT NULL,
  tutor_area TEXT NOT NULL,
  tutor_subject TEXT NOT NULL,
  tutor_experience TEXT,
  tutor_price TEXT,
  tutor_icon TEXT,
  status public.outreach_status NOT NULL DEFAULT 'invited',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_outreach ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tutor outreach" ON public.tutor_outreach FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tutor outreach" ON public.tutor_outreach FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tutor outreach" ON public.tutor_outreach FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tutor outreach" ON public.tutor_outreach FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can read all tutor outreach" ON public.tutor_outreach FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete tutor outreach" ON public.tutor_outreach FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create student_filter_usage_logs table
CREATE TABLE public.student_filter_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filter_type TEXT NOT NULL,
  filter_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_filter_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own student filter logs" ON public.student_filter_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can read all student filter logs" ON public.student_filter_usage_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete student filter logs" ON public.student_filter_usage_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
