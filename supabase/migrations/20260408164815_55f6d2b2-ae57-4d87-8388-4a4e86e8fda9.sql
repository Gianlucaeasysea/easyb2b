
-- Sales already have SELECT/INSERT/DELETE policies on price_list_clients but missing UPDATE
-- Add a full ALL policy for sales on their assigned clients (covers any gaps)
-- First check existing: Sales already has insert, delete, select policies. Let's add an UPDATE one.
CREATE POLICY "Sales update price_list_clients"
  ON price_list_clients
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'sales'::app_role)
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );
