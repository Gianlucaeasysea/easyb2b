
-- Fix price_lists: dealers should see price lists assigned via price_list_clients
DROP POLICY IF EXISTS "Dealers view own price_lists" ON public.price_lists;
CREATE POLICY "Dealers view own price_lists" ON public.price_lists
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT plc.price_list_id FROM public.price_list_clients plc
    WHERE plc.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  )
  OR
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

-- Fix price_list_items: dealers should see items from price lists assigned via price_list_clients
DROP POLICY IF EXISTS "Dealers view own price_list_items" ON public.price_list_items;
CREATE POLICY "Dealers view own price_list_items" ON public.price_list_items
FOR SELECT TO authenticated
USING (
  price_list_id IN (
    SELECT plc.price_list_id FROM public.price_list_clients plc
    WHERE plc.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  )
  OR
  price_list_id IN (
    SELECT pl.id FROM public.price_lists pl
    WHERE pl.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  )
);
