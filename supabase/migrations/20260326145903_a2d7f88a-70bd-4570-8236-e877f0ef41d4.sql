
CREATE POLICY "Sales manage client_contacts"
ON public.client_contacts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));
