
DROP POLICY IF EXISTS "Authenticated read products" ON products;

CREATE POLICY "Dealers read active b2b products" ON products
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'dealer'::app_role)
    AND active_b2b = true
  );

CREATE POLICY "Staff read all products" ON products
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );
