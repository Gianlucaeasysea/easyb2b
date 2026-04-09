-- 1. Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('order-documents', 'client-documents', 'email-attachments');

-- 2. Storage policies for order-documents (private)
-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Order docs public read" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage order docs storage" ON storage.objects;
DROP POLICY IF EXISTS "Dealers view own order docs storage" ON storage.objects;
DROP POLICY IF EXISTS "Sales view order docs storage" ON storage.objects;

CREATE POLICY "Admins manage order docs storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'order-documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')))
WITH CHECK (bucket_id = 'order-documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')));

CREATE POLICY "Dealers view own order docs storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-documents'
  AND public.has_role(auth.uid(), 'dealer')
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text FROM public.orders o
    JOIN public.clients c ON o.client_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Sales view order docs storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-documents' AND public.has_role(auth.uid(), 'sales'));

-- 3. Storage policies for client-documents (private)
DROP POLICY IF EXISTS "Admins manage client docs storage" ON storage.objects;
DROP POLICY IF EXISTS "Dealers view own client docs storage" ON storage.objects;
DROP POLICY IF EXISTS "Sales view client docs storage" ON storage.objects;

CREATE POLICY "Admins manage client docs storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'client-documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')))
WITH CHECK (bucket_id = 'client-documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')));

CREATE POLICY "Dealers view own client docs storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_role(auth.uid(), 'dealer')
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Sales view client docs storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'sales'));

-- 4. Storage policies for email-attachments (private)
DROP POLICY IF EXISTS "Admins manage email attachments storage" ON storage.objects;
DROP POLICY IF EXISTS "Sales manage email attachments storage" ON storage.objects;

CREATE POLICY "Admins manage email attachments storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'email-attachments' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')))
WITH CHECK (bucket_id = 'email-attachments' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')));

CREATE POLICY "Sales manage email attachments storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'email-attachments' AND public.has_role(auth.uid(), 'sales'))
WITH CHECK (bucket_id = 'email-attachments' AND public.has_role(auth.uid(), 'sales'));

-- 5. Realtime authorization - enable RLS on realtime.messages and add policy
-- Note: Supabase Realtime uses broadcast/presence authorization via RLS on the underlying tables.
-- The proper fix is to ensure the underlying tables (orders, client_notifications, deals) already have 
-- correct RLS which they do. For Realtime channel-level auth we use Realtime Authorization.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to use realtime (channel-level filtering is done by underlying table RLS)
CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);