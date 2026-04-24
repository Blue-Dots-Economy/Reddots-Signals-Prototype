UPDATE public.lahi_connections lc
SET to_name = cd.name
FROM public.centre_dots cd
WHERE lc.to_dot_id = cd.id::text AND lc.to_name IS DISTINCT FROM cd.name;

UPDATE public.lahi_connections lc
SET to_name = sd.name
FROM public.student_dots sd
WHERE lc.to_dot_id = sd.id::text AND lc.to_name IS DISTINCT FROM sd.name;

UPDATE public.lahi_connections lc
SET from_name = cd.name
FROM public.centre_dots cd
WHERE lc.from_dot_id = cd.id::text AND lc.from_name IS DISTINCT FROM cd.name;

UPDATE public.lahi_connections lc
SET from_name = sd.name
FROM public.student_dots sd
WHERE lc.from_dot_id = sd.id::text AND lc.from_name IS DISTINCT FROM sd.name;