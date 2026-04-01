INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins and sales upload email attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-attachments' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')));

CREATE POLICY "Admins and sales read email attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'email-attachments' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')));

CREATE POLICY "Admins and sales delete email attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'email-attachments' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')));