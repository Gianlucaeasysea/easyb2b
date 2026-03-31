CREATE POLICY "Sales manage distributor_requests"
ON public.distributor_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));