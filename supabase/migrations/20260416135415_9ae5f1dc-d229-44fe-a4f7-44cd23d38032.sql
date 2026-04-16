-- Allow admins and sales to delete distributor requests
CREATE POLICY "Admins and sales delete requests"
ON public.distributor_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role));
