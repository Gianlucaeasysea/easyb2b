
-- Drop the overly broad sales policies on orders
DROP POLICY IF EXISTS "Sales view orders" ON orders;
DROP POLICY IF EXISTS "Sales insert orders for assigned clients" ON orders;

-- Sales can only VIEW orders for their assigned clients
CREATE POLICY "Sales view assigned client orders" ON orders
  FOR SELECT USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND client_id IN (
      SELECT id FROM clients WHERE assigned_sales_id = auth.uid()
    )
  );

-- Sales can INSERT orders for their assigned clients
CREATE POLICY "Sales create orders for assigned clients" ON orders
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'sales'::app_role)
    AND client_id IN (
      SELECT id FROM clients WHERE assigned_sales_id = auth.uid()
    )
  );

-- Drop the overly broad sales policy on order_items
DROP POLICY IF EXISTS "Sales view order_items" ON order_items;

-- Sales can only view order items for their assigned client orders
CREATE POLICY "Sales view order items for assigned clients" ON order_items
  FOR SELECT USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.assigned_sales_id = auth.uid()
    )
  );

-- Drop the overly broad sales policy on order_documents
DROP POLICY IF EXISTS "Sales view order_documents" ON order_documents;

-- Sales can only view documents for their assigned client orders
CREATE POLICY "Sales view order documents for assigned clients" ON order_documents
  FOR SELECT USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.assigned_sales_id = auth.uid()
    )
  );
