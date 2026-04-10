CREATE OR REPLACE FUNCTION public.create_deal_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'draft' THEN
    INSERT INTO public.deals (title, stage, value, client_id, assigned_to, notes, source, order_id, probability)
    SELECT
      'Bozza #' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' - ' || c.company_name,
      'draft',
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