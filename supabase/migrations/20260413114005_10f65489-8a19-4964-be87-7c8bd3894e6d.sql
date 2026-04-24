
-- Create the unified connections table
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  from_persona text NOT NULL,
  to_user_id uuid NOT NULL,
  to_persona text NOT NULL,
  from_dot_id text,
  to_dot_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_connection_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.from_persona NOT IN ('student', 'tutor', 'cl_centre', 'hei') THEN
    RAISE EXCEPTION 'Invalid from_persona: %', NEW.from_persona;
  END IF;
  IF NEW.to_persona NOT IN ('student', 'tutor', 'cl_centre', 'hei') THEN
    RAISE EXCEPTION 'Invalid to_persona: %', NEW.to_persona;
  END IF;
  IF NEW.from_user_id = NEW.to_user_id THEN
    RAISE EXCEPTION 'Cannot connect to yourself';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_connection_before_upsert
BEFORE INSERT OR UPDATE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.validate_connection_fields();

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Sender can insert
CREATE POLICY "Users can insert own connections"
ON public.connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id);

-- Both parties can read
CREATE POLICY "Users can view own connections"
ON public.connections FOR SELECT
TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Receiver can update status
CREATE POLICY "Receiver can update connection"
ON public.connections FOR UPDATE
TO authenticated
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- Sender can delete their own sent connection
CREATE POLICY "Sender can delete own connection"
ON public.connections FOR DELETE
TO authenticated
USING (auth.uid() = from_user_id);

-- Admin full read
CREATE POLICY "Admin can read all connections"
ON public.connections FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete
CREATE POLICY "Admin can delete connections"
ON public.connections FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
