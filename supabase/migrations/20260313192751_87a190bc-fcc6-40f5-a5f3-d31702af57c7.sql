
CREATE TABLE public.sheet_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_url text NOT NULL,
  sheet_id text NOT NULL,
  dot_type text NOT NULL DEFAULT 'student',
  last_synced_at timestamp with time zone,
  sync_status text DEFAULT 'idle',
  sync_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sheet_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage sheet configs"
ON public.sheet_configs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
