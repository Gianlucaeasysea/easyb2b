
-- Drop existing policies on client_communications
DROP POLICY IF EXISTS "Admins and sales manage communications" ON client_communications;
DROP POLICY IF EXISTS "Dealers view own communications" ON client_communications;

-- Admin and operations full access
CREATE POLICY "Admins and operations full access on communications"
  ON client_communications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- Sales can view communications for their assigned clients
CREATE POLICY "Sales view assigned client communications"
  ON client_communications FOR SELECT
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );

-- Sales can insert communications for their assigned clients
CREATE POLICY "Sales insert assigned client communications"
  ON client_communications FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'sales'::app_role)
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );

-- Dealers can only view communications for their own client record
CREATE POLICY "Dealers view own communications"
  ON client_communications FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );
