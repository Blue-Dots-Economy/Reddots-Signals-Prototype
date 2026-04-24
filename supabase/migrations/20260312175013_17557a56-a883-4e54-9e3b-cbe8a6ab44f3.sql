
CREATE POLICY "Admin can delete outreach" ON public.outreach FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete filter logs" ON public.filter_usage_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
