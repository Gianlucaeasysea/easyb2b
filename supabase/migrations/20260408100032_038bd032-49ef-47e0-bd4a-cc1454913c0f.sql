
-- Add source and order_id columns to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- Create function to auto-create a deal when a non-draft order is inserted
CREATE OR REPLACE FUNCTION public.create_deal_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Trigger: create deal on order insert (skip drafts)
CREATE TRIGGER on_order_create_deal
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM 'draft')
EXECUTE FUNCTION public.create_deal_from_order();

-- Create function to sync deal when order is updated
CREATE OR REPLACE FUNCTION public.sync_deal_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- If order transitions from draft to non-draft, create deal if none exists
  IF OLD.status = 'draft' AND NEW.status IS DISTINCT FROM 'draft' THEN
    IF NOT EXISTS (SELECT 1 FROM public.deals WHERE order_id = NEW.id) THEN
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
$$;

-- Trigger: sync deal on order update
CREATE TRIGGER on_order_update_sync_deal
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_deal_on_order_update();
