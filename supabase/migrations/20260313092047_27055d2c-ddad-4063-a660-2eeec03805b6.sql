
-- Student dots table
CREATE TABLE public.student_dots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  pillar TEXT NOT NULL DEFAULT 'subject_tutoring',
  icon TEXT NOT NULL DEFAULT 'book',
  category TEXT NOT NULL DEFAULT 'blue',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  contact TEXT NOT NULL DEFAULT 'direct',
  description TEXT,
  relevance TEXT,
  education TEXT,
  skills TEXT,
  availability TEXT,
  distance TEXT,
  grade TEXT,
  needs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tutor dots table
CREATE TABLE public.tutor_dots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'mathematics',
  icon TEXT NOT NULL DEFAULT 'book',
  experience TEXT,
  price_range TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT,
  relevance TEXT,
  qualification TEXT,
  availability TEXT,
  distance TEXT,
  rating TEXT,
  languages TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_dots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_dots ENABLE ROW LEVEL SECURITY;

-- Admin full access policies for student_dots
CREATE POLICY "Admin can read student dots" ON public.student_dots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert student dots" ON public.student_dots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update student dots" ON public.student_dots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete student dots" ON public.student_dots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Public read access for all authenticated users (tutors/students need to see dots)
CREATE POLICY "Authenticated users can read student dots" ON public.student_dots FOR SELECT TO authenticated USING (true);

-- Admin full access policies for tutor_dots
CREATE POLICY "Admin can read tutor dots" ON public.tutor_dots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert tutor dots" ON public.tutor_dots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update tutor dots" ON public.tutor_dots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete tutor dots" ON public.tutor_dots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Public read access for all authenticated users
CREATE POLICY "Authenticated users can read tutor dots" ON public.tutor_dots FOR SELECT TO authenticated USING (true);
