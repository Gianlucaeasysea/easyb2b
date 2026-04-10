DELETE FROM public.deals WHERE order_id = 'ca70e1b0-4e25-4047-a0b0-3a98a0099b02'::uuid;
DELETE FROM public.order_items WHERE order_id = 'ca70e1b0-4e25-4047-a0b0-3a98a0099b02'::uuid;
DELETE FROM public.orders WHERE id = 'ca70e1b0-4e25-4047-a0b0-3a98a0099b02'::uuid;

DELETE FROM public.deals WHERE order_id = '52209ab8-02be-4300-ac8b-d24b4f176bcb'::uuid;
DELETE FROM public.order_items WHERE order_id = '52209ab8-02be-4300-ac8b-d24b4f176bcb'::uuid;
DELETE FROM public.orders WHERE id = '52209ab8-02be-4300-ac8b-d24b4f176bcb'::uuid;