
-- A3: Payment terms on clients and orders
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT '30_days';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_terms_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_terms text;

-- A1: Admin notes on distributor_requests
ALTER TABLE public.distributor_requests ADD COLUMN IF NOT EXISTS admin_notes text;

-- Validation trigger for payment_terms (not CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_payment_terms()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.payment_terms IS NOT NULL AND NEW.payment_terms NOT IN ('prepaid', '30_days', '60_days', '90_days', 'end_of_month') THEN
    RAISE EXCEPTION 'Invalid payment_terms value: %', NEW.payment_terms;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_client_payment_terms
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_terms();

-- D2: Trigger to create payment_received event when payment_status changes to paid
CREATE OR REPLACE FUNCTION public.create_payment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.order_events (order_id, event_type, title, description)
    VALUES (
      NEW.id,
      'payment_received',
      'Pagamento ricevuto',
      'Il pagamento dell''ordine è stato registrato.'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_payment_status_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_event();

-- D3: Update create_deal_from_order to handle drafts differently
CREATE OR REPLACE FUNCTION public.create_deal_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip draft orders - they get deals via sync_deal_on_order_update when confirmed
  IF NEW.status = 'draft' THEN
    INSERT INTO public.deals (title, stage, value, client_id, assigned_to, notes, source, order_id, probability)
    SELECT
      'Bozza #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' - ' || c.company_name,
      'new',
      COALESCE(NEW.total_amount, 0),
      NEW.client_id,
      c.assigned_sales_id,
      'Bozza creata dal dealer',
      'dealer_draft',
      NEW.id,
      50
    FROM public.clients c WHERE c.id = NEW.client_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.deals (title, stage, value, client_id, closed_at, assigned_to, notes, source, order_id, probability)
  SELECT
    'Ordine #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' - ' || c.company_name,
    'closed_won',
    COALESCE(NEW.total_amount, 0),
    NEW.client_id,
    NEW.created_at,
    c.assigned_sales_id,
    'Deal creato automaticamente da ordine #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)),
    'order',
    NEW.id,
    100
  FROM public.clients c WHERE c.id = NEW.client_id;
  RETURN NEW;
END;
$function$;

-- Update sync_deal_on_order_update to handle draft->confirmed transition properly
CREATE OR REPLACE FUNCTION public.sync_deal_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If order is cancelled, mark deal as lost
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.deals
    SET stage = 'closed_lost',
        lost_reason = 'Ordine annullato',
        closed_at = now(),
        probability = 0,
        updated_at = now()
    WHERE order_id = NEW.id;
  END IF;

  -- Sync total_amount to deal value
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    UPDATE public.deals
    SET value = COALESCE(NEW.total_amount, 0),
        updated_at = now()
    WHERE order_id = NEW.id;
  END IF;

  -- If order transitions from draft to confirmed, update deal to closed_won
  IF OLD.status = 'draft' AND NEW.status IS DISTINCT FROM 'draft' AND NEW.status <> 'cancelled' THEN
    IF EXISTS (SELECT 1 FROM public.deals WHERE order_id = NEW.id) THEN
      UPDATE public.deals
      SET stage = 'closed_won',
          title = 'Ordine #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' - ' || (SELECT company_name FROM public.clients WHERE id = NEW.client_id),
          value = COALESCE(NEW.total_amount, 0),
          closed_at = now(),
          probability = 100,
          source = 'order',
          updated_at = now()
      WHERE order_id = NEW.id;
    ELSE
      INSERT INTO public.deals (title, stage, value, client_id, closed_at, assigned_to, notes, source, order_id, probability)
      SELECT
        'Ordine #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' - ' || c.company_name,
        'closed_won',
        COALESCE(NEW.total_amount, 0),
        NEW.client_id,
        now(),
        c.assigned_sales_id,
        'Deal creato automaticamente da ordine #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)),
        'order',
        NEW.id,
        100
      FROM public.clients c WHERE c.id = NEW.client_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
