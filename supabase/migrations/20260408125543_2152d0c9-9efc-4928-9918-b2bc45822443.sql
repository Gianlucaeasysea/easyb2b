
-- Drop the old trigger that excludes drafts
DROP TRIGGER IF EXISTS on_order_create_deal ON public.orders;

-- Recreate without the WHEN clause so it fires for ALL new orders including drafts
CREATE TRIGGER on_order_create_deal
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_deal_from_order();

-- Manually create the deal for the existing draft order that was missed
INSERT INTO public.deals (title, stage, value, client_id, assigned_to, notes, source, order_id, probability)
SELECT
  'Bozza #' || COALESCE(o.order_code, LEFT(o.id::text, 8)) || ' - ' || c.company_name,
  'new',
  COALESCE(o.total_amount, 0),
  o.client_id,
  c.assigned_sales_id,
  'Bozza creata dal dealer',
  'dealer_draft',
  o.id,
  50
FROM public.orders o
JOIN public.clients c ON c.id = o.client_id
WHERE o.id = '1a890898-82b8-417b-b69d-ae6bbbd8c886'
AND NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.order_id = o.id);
