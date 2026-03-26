-- Sales can view all orders (they already can view all clients)
CREATE POLICY "Sales view orders"
  ON public.orders FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'sales'::app_role));

-- Sales can view order items for visible orders
CREATE POLICY "Sales view order_items"
  ON public.order_items FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'sales'::app_role));

-- Sales can view order documents
CREATE POLICY "Sales view order_documents"
  ON public.order_documents FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'sales'::app_role));

-- Sales can view shipping addresses
CREATE POLICY "Sales view shipping_addresses"
  ON public.client_shipping_addresses FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'sales'::app_role));

-- Sales can view bank details
CREATE POLICY "Sales view bank_details"
  ON public.client_bank_details FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'sales'::app_role));

-- Sales can view order events
CREATE POLICY "Sales view order_events"
  ON public.order_events FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'sales'::app_role));