CREATE POLICY "Dealers insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT o.id FROM orders o
    WHERE o.client_id IN (
      SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
    )
  )
);