-- 1. Fix: Sales can only view bank details for their assigned clients
DROP POLICY IF EXISTS "Sales view bank_details" ON client_bank_details;
CREATE POLICY "Sales view assigned client bank_details" ON client_bank_details
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'sales')
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );

-- 2. Fix: Restrict dealer order updates to safe columns only
DROP POLICY IF EXISTS "Dealers update own orders" ON orders;

CREATE OR REPLACE FUNCTION public.restrict_dealer_order_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'dealer') THEN
    NEW.payment_status := OLD.payment_status;
    NEW.internal_notes := OLD.internal_notes;
    NEW.tracking_number := OLD.tracking_number;
    NEW.tracking_url := OLD.tracking_url;
    NEW.shipping_cost_client := OLD.shipping_cost_client;
    NEW.shipping_cost_easysea := OLD.shipping_cost_easysea;
    NEW.payment_terms := OLD.payment_terms;
    NEW.payment_due_date := OLD.payment_due_date;
    NEW.payed_date := OLD.payed_date;
    NEW.delivery_date := OLD.delivery_date;
    NEW.pickup_date := OLD.pickup_date;
    NEW.order_code := OLD.order_code;
    NEW.order_type := OLD.order_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_dealer_order_updates_trigger ON orders;
CREATE TRIGGER restrict_dealer_order_updates_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_dealer_order_updates();

CREATE POLICY "Dealers update own orders" ON orders
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'dealer')
    AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'dealer')
    AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- 3. Fix: Scope sales client_contacts access to assigned clients only
DROP POLICY IF EXISTS "Sales view client_contacts" ON client_contacts;
CREATE POLICY "Sales view assigned client_contacts" ON client_contacts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'sales')
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sales manage client_contacts" ON client_contacts;
CREATE POLICY "Sales manage assigned client_contacts" ON client_contacts
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'sales')
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'sales')
    AND client_id IN (SELECT id FROM clients WHERE assigned_sales_id = auth.uid())
  );