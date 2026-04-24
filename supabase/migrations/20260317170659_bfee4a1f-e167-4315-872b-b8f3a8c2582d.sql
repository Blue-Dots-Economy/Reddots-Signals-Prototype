
-- Create counsellor_dots table (similar to tutor_dots)
CREATE TABLE public.counsellor_dots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  area text NOT NULL,
  speciality text NOT NULL DEFAULT 'general',
  icon text NOT NULL DEFAULT 'compass',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  experience text,
  price_range text,
  availability text,
  rating text,
  languages text,
  qualification text,
  description text,
  email text,
  contact text NOT NULL DEFAULT 'direct',
  distance text,
  relevance text,
  mode text DEFAULT 'online',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.counsellor_dots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read counsellor dots" ON public.counsellor_dots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert counsellor dots" ON public.counsellor_dots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update counsellor dots" ON public.counsellor_dots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete counsellor dots" ON public.counsellor_dots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can read counsellor dots" ON public.counsellor_dots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Create centre_dots table (Career Launcher Centres)
CREATE TABLE public.centre_dots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  area text NOT NULL,
  icon text NOT NULL DEFAULT 'clipboard',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  services text,
  fees text,
  address text,
  contact text NOT NULL DEFAULT 'direct',
  email text,
  description text,
  availability text,
  rating text,
  distance text,
  relevance text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.centre_dots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read centre dots" ON public.centre_dots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert centre dots" ON public.centre_dots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update centre dots" ON public.centre_dots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete centre dots" ON public.centre_dots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can read centre dots" ON public.centre_dots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Create college_dots table
CREATE TABLE public.college_dots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  area text NOT NULL,
  icon text NOT NULL DEFAULT 'graduationCap',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  programs text,
  fees text,
  address text,
  contact text NOT NULL DEFAULT 'direct',
  email text,
  description text,
  availability text,
  rating text,
  distance text,
  relevance text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_dots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read college dots" ON public.college_dots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert college dots" ON public.college_dots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update college dots" ON public.college_dots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete college dots" ON public.college_dots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can read college dots" ON public.college_dots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.counsellor_dots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.centre_dots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.college_dots;
