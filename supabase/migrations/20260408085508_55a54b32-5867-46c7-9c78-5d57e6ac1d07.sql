
-- Drop existing policies
DROP POLICY IF EXISTS "Admins and operations full access on communications" ON client_communications;
DROP POLICY IF EXISTS "Dealers view own communications" ON client_communications;
DROP POLICY IF EXISTS "Sales insert assigned client communications" ON client_communications;
DROP POLICY IF EXISTS "Sales view assigned client communications" ON client_communications;

-- Ensure RLS is enabled
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;

-- Admin and operations full access
CREATE POLICY "Admins manage communications" ON client_communications
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations')
  );

-- Sales view communications for assigned clients
CREATE POLICY "Sales view own client communications" ON client_communications
  FOR SELECT USING (
    has_role(auth.uid(), 'sales') AND
    client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );

-- Sales insert communications for assigned clients
CREATE POLICY "Sales insert own client communications" ON client_communications
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'sales') AND
    client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );

-- Dealers view own communications
CREATE POLICY "Dealers view own communications" ON client_communications
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );
