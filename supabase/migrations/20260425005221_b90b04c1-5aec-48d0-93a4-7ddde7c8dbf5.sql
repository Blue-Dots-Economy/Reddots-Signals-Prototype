CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.pothole_dots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'circle-dot',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  contact TEXT NOT NULL DEFAULT 'direct',
  email TEXT,
  description TEXT,
  severity TEXT,
  road_class TEXT,
  size TEXT,
  depth TEXT,
  status TEXT,
  reported_by TEXT,
  reported_on TEXT,
  remarks TEXT,
  unique_id TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pothole_dots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pothole dots"
ON public.pothole_dots FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert pothole dots"
ON public.pothole_dots FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update pothole dots"
ON public.pothole_dots FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete pothole dots"
ON public.pothole_dots FOR DELETE
TO authenticated
USING (true);

CREATE TRIGGER update_pothole_dots_updated_at
BEFORE UPDATE ON public.pothole_dots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();