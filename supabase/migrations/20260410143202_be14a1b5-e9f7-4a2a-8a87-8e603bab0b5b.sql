-- Sales full access to price_lists
CREATE POLICY "Sales manage price_lists"
  ON public.price_lists
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'sales'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'sales'::public.app_role));

-- Sales full access to price_list_items
CREATE POLICY "Sales manage price_list_items"
  ON public.price_list_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'sales'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'sales'::public.app_role));