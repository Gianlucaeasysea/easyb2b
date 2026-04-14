-- Drop restrictive sales policies
DROP POLICY "Sales view price_list_clients" ON public.price_list_clients;
DROP POLICY "Sales delete price_list_clients" ON public.price_list_clients;
DROP POLICY "Sales update price_list_clients" ON public.price_list_clients;
DROP POLICY "Sales insert price_list_clients" ON public.price_list_clients;

-- Give sales full access like admin
CREATE POLICY "Sales full access price_list_clients"
ON public.price_list_clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));