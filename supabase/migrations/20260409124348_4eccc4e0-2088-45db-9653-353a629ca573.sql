-- Performance indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_sales ON public.clients(assigned_sales_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client ON public.client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.client_notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.client_notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON public.client_notifications(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_price_list_clients_client ON public.price_list_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_price_list_clients_list ON public.price_list_clients(price_list_id);
CREATE INDEX IF NOT EXISTS idx_deals_client ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_order ON public.deals(order_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON public.deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_communications_client ON public.client_communications(client_id);

-- Add missing FK: client_notifications.client_id → clients.id
ALTER TABLE public.client_notifications
  ADD CONSTRAINT client_notifications_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;