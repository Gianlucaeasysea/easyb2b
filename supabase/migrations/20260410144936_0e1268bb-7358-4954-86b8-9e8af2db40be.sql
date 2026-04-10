ALTER FUNCTION public.generate_order_code() SET search_path = public;
ALTER FUNCTION public.create_order_with_items(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) SET search_path = public;