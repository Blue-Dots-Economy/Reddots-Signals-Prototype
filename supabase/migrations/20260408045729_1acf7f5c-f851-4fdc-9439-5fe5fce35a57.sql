CREATE POLICY "Anon can check email in student_dots" ON public.student_dots FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can check email in tutor_dots" ON public.tutor_dots FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can check email in counsellor_dots" ON public.counsellor_dots FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can check email in centre_dots" ON public.centre_dots FOR SELECT TO anon USING (true);