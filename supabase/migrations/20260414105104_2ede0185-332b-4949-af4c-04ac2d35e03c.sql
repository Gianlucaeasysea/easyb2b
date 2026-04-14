DROP POLICY "Admins manage price_list_clients" ON public.price_list_clients;

CREATE POLICY "Admins manage price_list_clients"
ON public.price_list_clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also allow sales to insert for ANY client (not just assigned) from admin UI
DROP POLICY "Sales insert price_list_clients" ON public.price_list_clients;

CREATE POLICY "Sales insert price_list_clients"
ON public.price_list_clients
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales'::app_role)
);