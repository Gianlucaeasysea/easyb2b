
-- Drop the overly restrictive sales SELECT policy on orders
DROP POLICY IF EXISTS "Sales view assigned client orders" ON orders;

-- Sales can view ALL orders (needed for CRM functionality)
CREATE POLICY "Sales view all orders" ON orders
  FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

-- Also fix order_items: sales need to see items for all orders they can view
DROP POLICY IF EXISTS "Sales view order items for assigned clients" ON order_items;

CREATE POLICY "Sales view all order items" ON order_items
  FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

-- Fix order_documents: sales need to see docs for all orders
DROP POLICY IF EXISTS "Sales view order documents for assigned clients" ON order_documents;

CREATE POLICY "Sales view all order documents" ON order_documents
  FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

-- Also add dealer UPDATE policy (needed for cancel submitted orders feature)
CREATE POLICY "Dealers update own orders" ON orders
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );
