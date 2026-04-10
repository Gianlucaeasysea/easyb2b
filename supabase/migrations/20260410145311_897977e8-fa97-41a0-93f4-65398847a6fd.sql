DELETE FROM public.order_events WHERE order_id = '0d1095c2-9aab-4d4a-9520-5508f5491543'::uuid;
DELETE FROM public.deals WHERE order_id = '0d1095c2-9aab-4d4a-9520-5508f5491543'::uuid;
DELETE FROM public.order_items WHERE order_id = '0d1095c2-9aab-4d4a-9520-5508f5491543'::uuid;
DELETE FROM public.orders WHERE id = '0d1095c2-9aab-4d4a-9520-5508f5491543'::uuid;