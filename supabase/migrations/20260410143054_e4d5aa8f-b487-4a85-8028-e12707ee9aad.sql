-- Sales can view all clients (needed for contacts JOIN to show organization names)
-- This is SELECT-only — does not allow modification
CREATE POLICY "Sales view all clients for contacts"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'sales'::public.app_role));