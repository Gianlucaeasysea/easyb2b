-- P0 #1: Dealers can delete their own draft orders
CREATE POLICY "Dealers delete own draft orders" ON public.orders
FOR DELETE TO authenticated
USING (
  status = 'draft'
  AND client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- P0 #1: Dealers can delete order items of their own draft orders
CREATE POLICY "Dealers delete own draft order items" ON public.order_items
FOR DELETE TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders
    WHERE status = 'draft'
    AND client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
);

-- P0 #2: Dealers can update order items of their own draft orders
CREATE POLICY "Dealers update own draft order items" ON public.order_items
FOR UPDATE TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders
    WHERE status = 'draft'
    AND client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders
    WHERE status = 'draft'
    AND client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
);

-- P1 #6: Sales can update orders for their assigned clients
CREATE POLICY "Sales update orders for assigned clients" ON public.orders
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'sales') 
  AND client_id IN (SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'sales')
  AND client_id IN (SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid())
);

-- P1 #6: Update create_order_with_items to accept internal_notes
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_client_id uuid,
  p_status text DEFAULT 'draft',
  p_notes text DEFAULT NULL,
  p_payment_terms text DEFAULT NULL,
  p_order_type text DEFAULT NULL,
  p_items jsonb DEFAULT '[]',
  p_internal_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_total NUMERIC := 0;
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + COALESCE((v_item->>'subtotal')::numeric, 0);
  END LOOP;

  INSERT INTO public.orders (client_id, status, total_amount, notes, payment_terms, payment_status, order_type, internal_notes)
  VALUES (p_client_id, p_status, v_total, p_notes, p_payment_terms, 'unpaid', p_order_type, p_internal_notes)
  RETURNING id, order_code INTO v_order_id, v_order_code;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, discount_pct, subtotal)
  SELECT
    v_order_id,
    (item->>'product_id')::uuid,
    COALESCE((item->>'quantity')::integer, 1),
    (item->>'unit_price')::numeric,
    COALESCE((item->>'discount_pct')::numeric, 0),
    COALESCE((item->>'subtotal')::numeric, 0)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN jsonb_build_object('id', v_order_id, 'order_code', v_order_code);
END;
$$;