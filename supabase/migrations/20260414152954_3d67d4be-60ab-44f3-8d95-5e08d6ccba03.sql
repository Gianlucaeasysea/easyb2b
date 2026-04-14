
-- Delete related records first
DELETE FROM public.order_events;
DELETE FROM public.order_documents;
DELETE FROM public.order_items;
DELETE FROM public.client_communications WHERE order_id IS NOT NULL;
DELETE FROM public.client_notifications WHERE order_id IS NOT NULL;

-- Clear deal-order links
UPDATE public.deals SET order_id = NULL WHERE order_id IS NOT NULL;

-- Delete all orders
DELETE FROM public.orders;
