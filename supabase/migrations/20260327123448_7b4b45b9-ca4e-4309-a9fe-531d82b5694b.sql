
-- Add new lifecycle fields to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS disqualified_reason text,
  ADD COLUMN IF NOT EXISTS last_order_date date,
  ADD COLUMN IF NOT EXISTS last_order_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_order_frequency_days integer,
  ADD COLUMN IF NOT EXISTS days_since_last_order integer,
  ADD COLUMN IF NOT EXISTS next_reorder_expected_date date,
  ADD COLUMN IF NOT EXISTS platform_client_id text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone DEFAULT now();

-- Create a trigger function to auto-compute days_since_last_order and next_reorder_expected_date
CREATE OR REPLACE FUNCTION public.compute_client_order_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.last_order_date IS NOT NULL THEN
    NEW.days_since_last_order := (CURRENT_DATE - NEW.last_order_date);
  ELSE
    NEW.days_since_last_order := NULL;
  END IF;
  
  IF NEW.last_order_date IS NOT NULL AND NEW.avg_order_frequency_days IS NOT NULL AND NEW.avg_order_frequency_days > 0 THEN
    NEW.next_reorder_expected_date := NEW.last_order_date + (NEW.avg_order_frequency_days || ' days')::interval;
  ELSE
    NEW.next_reorder_expected_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER compute_client_order_fields_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.compute_client_order_fields();

-- Track when status changes
CREATE OR REPLACE FUNCTION public.track_client_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER track_client_status_change_trigger
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.track_client_status_change();
