
-- Sales can SELECT price_list_clients for their assigned clients
CREATE POLICY "Sales view price_list_clients"
ON public.price_list_clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND client_id IN (
    SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid()
  )
);

-- Sales can INSERT price_list_clients for their assigned clients
CREATE POLICY "Sales insert price_list_clients"
ON public.price_list_clients
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales'::app_role)
  AND client_id IN (
    SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid()
  )
);

-- Sales can DELETE price_list_clients for their assigned clients
CREATE POLICY "Sales delete price_list_clients"
ON public.price_list_clients
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND client_id IN (
    SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid()
  )
);

-- Sales can view price_lists (read-only)
CREATE POLICY "Sales view price_lists"
ON public.price_lists
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));

-- Sales can view price_list_items for their assigned clients' lists
CREATE POLICY "Sales view price_list_items"
ON public.price_list_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
);

-- Sales can insert price_list_items for lists linked to their clients
CREATE POLICY "Sales insert price_list_items"
ON public.price_list_items
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales'::app_role)
  AND price_list_id IN (
    SELECT pl.id FROM public.price_lists pl
    WHERE pl.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.assigned_sales_id = auth.uid()
    )
  )
);

-- Sales can update price_list_items for lists linked to their clients
CREATE POLICY "Sales update price_list_items"
ON public.price_list_items
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND price_list_id IN (
    SELECT pl.id FROM public.price_lists pl
    WHERE pl.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.assigned_sales_id = auth.uid()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'sales'::app_role)
  AND price_list_id IN (
    SELECT pl.id FROM public.price_lists pl
    WHERE pl.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.assigned_sales_id = auth.uid()
    )
  )
);
