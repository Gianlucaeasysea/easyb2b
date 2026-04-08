
-- Add targeting columns to client_notifications
ALTER TABLE public.client_notifications ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'dealer';
ALTER TABLE public.client_notifications ADD COLUMN IF NOT EXISTS target_user_id UUID;

-- Drop existing RLS policies on client_notifications that need updating
DROP POLICY IF EXISTS "Admins manage notifications" ON public.client_notifications;
DROP POLICY IF EXISTS "Dealers view own notifications" ON public.client_notifications;
DROP POLICY IF EXISTS "Dealers update own notifications" ON public.client_notifications;
DROP POLICY IF EXISTS "Operations manage notifications" ON public.client_notifications;

-- Admin/operations can do everything
CREATE POLICY "Admins manage notifications" ON public.client_notifications
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

-- Dealers see notifications targeting their client_id (legacy) or target_role='dealer'
CREATE POLICY "Dealers view own notifications" ON public.client_notifications
FOR SELECT TO authenticated
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Dealers can mark their own notifications as read
CREATE POLICY "Dealers update own notifications" ON public.client_notifications
FOR UPDATE TO authenticated
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Users see notifications targeted to them specifically
CREATE POLICY "Users view targeted notifications" ON public.client_notifications
FOR SELECT TO authenticated
USING (target_user_id = auth.uid());

-- Users can mark their own targeted notifications as read
CREATE POLICY "Users update targeted notifications" ON public.client_notifications
FOR UPDATE TO authenticated
USING (target_user_id = auth.uid());

-- Users see notifications broadcast to their role
CREATE POLICY "Users view role notifications" ON public.client_notifications
FOR SELECT TO authenticated
USING (
  (target_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role))
  OR (target_role = 'sales' AND has_role(auth.uid(), 'sales'::app_role))
  OR (target_role = 'operations' AND has_role(auth.uid(), 'operations'::app_role))
);

-- Users can update role-broadcast notifications (mark as read)
CREATE POLICY "Users update role notifications" ON public.client_notifications
FOR UPDATE TO authenticated
USING (
  (target_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role))
  OR (target_role = 'sales' AND has_role(auth.uid(), 'sales'::app_role))
  OR (target_role = 'operations' AND has_role(auth.uid(), 'operations'::app_role))
);

-- Trigger function: notify admins on new order
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.client_notifications (client_id, title, body, type, target_role, target_user_id)
  VALUES (
    NEW.client_id,
    'Nuovo ordine ricevuto',
    'Ordine ' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' è stato inserito.',
    'order',
    'admin',
    NULL
  );
  RETURN NEW;
END;
$$;

-- Trigger function: notify admins on new distributor request
CREATE OR REPLACE FUNCTION public.notify_admin_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dummy_client_id uuid;
BEGIN
  SELECT id INTO dummy_client_id FROM public.clients LIMIT 1;
  INSERT INTO public.client_notifications (client_id, title, body, type, target_role, target_user_id)
  VALUES (
    COALESCE(dummy_client_id, '00000000-0000-0000-0000-000000000000'),
    'Nuova richiesta dealer',
    NEW.company_name || ' (' || NEW.contact_name || ') ha inviato una richiesta.',
    'info',
    'admin',
    NULL
  );
  RETURN NEW;
END;
$$;

-- Trigger function: notify admin on payment received
CREATE OR REPLACE FUNCTION public.notify_admin_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
    INSERT INTO public.client_notifications (client_id, title, body, type, target_role, order_id)
    VALUES (
      NEW.client_id,
      'Pagamento ricevuto',
      'Ordine ' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' è stato pagato.',
      'order',
      'admin',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: notify sales on lead assignment
CREATE OR REPLACE FUNCTION public.notify_sales_lead_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dummy_client_id uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    SELECT id INTO dummy_client_id FROM public.clients LIMIT 1;
    INSERT INTO public.client_notifications (client_id, title, body, type, target_role, target_user_id)
    VALUES (
      COALESCE(dummy_client_id, '00000000-0000-0000-0000-000000000000'),
      'Lead assegnato',
      'Ti è stato assegnato il lead: ' || NEW.company_name,
      'info',
      'sales',
      NEW.assigned_to
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_notify_admin_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_order();

CREATE TRIGGER trg_notify_admin_new_request
  AFTER INSERT ON public.distributor_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_request();

CREATE TRIGGER trg_notify_admin_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_payment();

CREATE TRIGGER trg_notify_sales_lead_assigned
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_sales_lead_assigned();
