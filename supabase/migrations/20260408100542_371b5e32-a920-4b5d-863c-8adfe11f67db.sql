
-- Allow sales to insert orders for their assigned clients
CREATE POLICY "Sales insert orders for assigned clients"
ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales'::app_role)
  AND client_id IN (SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid())
);

-- Allow sales to insert order_items for orders they created (for assigned clients)
CREATE POLICY "Sales insert order_items for assigned clients"
ON public.order_items
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales'::app_role)
  AND order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.clients c ON o.client_id = c.id
    WHERE c.assigned_sales_id = auth.uid()
  )
);
