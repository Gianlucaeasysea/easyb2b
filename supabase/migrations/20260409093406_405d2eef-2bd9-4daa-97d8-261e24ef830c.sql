
-- 1. Drop the deprecated portal_password column
ALTER TABLE public.clients DROP COLUMN IF EXISTS portal_password;

-- 2. Restrict automation_logs INSERT to admin/sales/operations only
DROP POLICY IF EXISTS "Authenticated users insert automation logs" ON public.automation_logs;
CREATE POLICY "Admin/sales insert automation logs"
  ON public.automation_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'sales') OR
    public.has_role(auth.uid(), 'operations')
  );

-- 3. Restrict dealer notification UPDATE to only the 'read' column
DROP POLICY IF EXISTS "Dealers update own notifications" ON public.client_notifications;
CREATE POLICY "Dealers mark own notifications read"
  ON public.client_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_notifications.client_id
        AND c.user_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'dealer')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_notifications.client_id
        AND c.user_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'dealer')
  );

-- 4. Fix storage policies: restrict client-documents reads to own documents
DROP POLICY IF EXISTS "Authenticated read client documents" ON storage.objects;
CREATE POLICY "Users read own client documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'sales')
      OR public.has_role(auth.uid(), 'operations')
      OR EXISTS (
        SELECT 1 FROM public.client_documents cd
        JOIN public.clients c ON c.id = cd.client_id
        WHERE c.user_id = auth.uid()
          AND cd.file_path = storage.objects.name
      )
    )
  );

-- 5. Fix storage policies: restrict order-documents reads to own orders
DROP POLICY IF EXISTS "Authenticated read order documents" ON storage.objects;
CREATE POLICY "Users read own order documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'sales')
      OR public.has_role(auth.uid(), 'operations')
      OR EXISTS (
        SELECT 1 FROM public.order_documents od
        JOIN public.orders o ON o.id = od.order_id
        JOIN public.clients c ON c.id = o.client_id
        WHERE c.user_id = auth.uid()
          AND od.file_path = storage.objects.name
      )
    )
  );
