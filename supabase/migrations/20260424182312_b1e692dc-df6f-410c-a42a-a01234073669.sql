
-- FIX 1: tab name override
ALTER TABLE public.sheet_configs
  ADD COLUMN IF NOT EXISTS sheet_tab_name text NOT NULL DEFAULT 'Sheet1';

-- FIX 3: hotspot vs pothole distinction
ALTER TABLE public.centre_dots
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'hotspot';

UPDATE public.centre_dots SET kind = 'hotspot' WHERE kind IS NULL OR kind = '';

-- Allow anyone to insert pothole reports (citizen-reported, no auth)
DROP POLICY IF EXISTS "Anyone can insert pothole reports" ON public.centre_dots;
CREATE POLICY "Anyone can insert pothole reports"
  ON public.centre_dots
  FOR INSERT
  TO public
  WITH CHECK (kind = 'pothole');

-- FIX 2: seed accidents sheet config (placeholder, admin can edit)
INSERT INTO public.sheet_configs (sheet_url, sheet_id, dot_type, sheet_tab_name, sync_status)
SELECT
  'https://docs.google.com/spreadsheets/d/PLACEHOLDER_REPLACE_ME/edit',
  'PLACEHOLDER_REPLACE_ME',
  'centre',
  'Sheet1',
  'idle'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sheet_configs WHERE dot_type IN ('centre', 'hotspot')
);
