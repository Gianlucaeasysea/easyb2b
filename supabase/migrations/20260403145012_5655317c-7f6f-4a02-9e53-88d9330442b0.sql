CREATE POLICY "Sales can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));