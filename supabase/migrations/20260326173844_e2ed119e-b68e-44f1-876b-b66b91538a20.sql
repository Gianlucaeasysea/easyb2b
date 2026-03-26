-- Allow admin and sales to delete leads
CREATE POLICY "Admin and sales delete leads"
ON public.leads
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role));

-- Allow admin and sales to delete activities
CREATE POLICY "Admin and sales delete activities"
ON public.activities
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role));