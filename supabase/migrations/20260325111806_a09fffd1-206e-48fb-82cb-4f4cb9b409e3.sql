-- Junction table for price_list <-> clients (many-to-many)
CREATE TABLE public.price_list_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, client_id)
);

ALTER TABLE public.price_list_clients ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage price_list_clients" ON public.price_list_clients
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Dealers can see their own assignments
CREATE POLICY "Dealers view own price_list_clients" ON public.price_list_clients
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid()));

-- Migrate existing client_id from price_lists into the junction table
INSERT INTO public.price_list_clients (price_list_id, client_id)
SELECT id, client_id FROM public.price_lists WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;