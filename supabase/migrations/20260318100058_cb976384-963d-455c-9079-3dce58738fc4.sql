
CREATE TABLE public.contact_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  outreach_id uuid NOT NULL,
  outreach_table text NOT NULL DEFAULT 'outreach',
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own views
CREATE POLICY "Users can insert own contact views"
ON public.contact_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "Admin can read all contact views"
ON public.contact_views FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can read own
CREATE POLICY "Users can read own contact views"
ON public.contact_views FOR SELECT TO authenticated
USING (auth.uid() = user_id);
