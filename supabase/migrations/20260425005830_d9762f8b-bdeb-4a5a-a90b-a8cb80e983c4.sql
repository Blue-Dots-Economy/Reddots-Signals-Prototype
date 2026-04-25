INSERT INTO public.pothole_dots
  (id, name, area, icon, lat, lng, contact, email, description,
   severity, road_class, remarks, address, created_at, updated_at)
SELECT
  id, name, area, 'circle-dot', lat, lng,
  COALESCE(contact, 'direct'), email, description,
  COALESCE(NULLIF(UPPER(relevance), ''), 'MODERATE'),
  nature_of_job, remarks, address, created_at, updated_at
FROM public.centre_dots
WHERE name ILIKE 'Pothole%'
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.centre_dots WHERE name ILIKE 'Pothole%';