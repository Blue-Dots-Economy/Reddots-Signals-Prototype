CREATE TABLE public.lahi_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phone text NOT NULL,
  from_persona text NOT NULL,
  from_dot_id text NOT NULL,
  from_name text,
  to_phone text NOT NULL,
  to_persona text NOT NULL,
  to_dot_id text NOT NULL,
  to_name text,
  status text NOT NULL DEFAULT 'pending',
  is_minor boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('shortlisted', 'pending', 'accepted', 'declined')),
  CONSTRAINT valid_from_persona CHECK (from_persona IN ('school_student', 'iti_student', 'msme_intern', 'msme_iti')),
  CONSTRAINT valid_to_persona CHECK (to_persona IN ('school_student', 'iti_student', 'msme_intern', 'msme_iti')),
  CONSTRAINT no_self_connect CHECK (from_phone != to_phone)
);

CREATE INDEX idx_lahi_conn_from ON public.lahi_connections(from_phone);
CREATE INDEX idx_lahi_conn_to ON public.lahi_connections(to_phone);
CREATE INDEX idx_lahi_conn_status ON public.lahi_connections(status);
CREATE UNIQUE INDEX idx_lahi_conn_unique ON public.lahi_connections(from_phone, to_dot_id);

ALTER TABLE public.lahi_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lahi connections"
  ON public.lahi_connections FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert lahi connections"
  ON public.lahi_connections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update lahi connections"
  ON public.lahi_connections FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete shortlisted lahi connections"
  ON public.lahi_connections FOR DELETE
  USING (status = 'shortlisted');

CREATE OR REPLACE FUNCTION public.update_lahi_connections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lahi_connections_updated_at
  BEFORE UPDATE ON public.lahi_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lahi_connections_updated_at();

ALTER TABLE public.lahi_connections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lahi_connections;