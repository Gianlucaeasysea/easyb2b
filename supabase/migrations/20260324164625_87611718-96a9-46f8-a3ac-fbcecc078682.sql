
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE public.discount_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  discount_pct numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discount_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount_tiers" ON public.discount_tiers FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read discount_tiers" ON public.discount_tiers FOR SELECT TO authenticated USING (true);

INSERT INTO public.discount_tiers (name, label, discount_pct, sort_order) VALUES
  ('gold', 'Gold', 30, 1),
  ('silver', 'Silver', 20, 2),
  ('bronze', 'Bronze', 15, 3),
  ('standard', 'Standard', 10, 4);

CREATE TABLE public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_tier_id uuid REFERENCES public.discount_tiers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage price_lists" ON public.price_lists FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Dealers view own price_lists" ON public.price_lists FOR SELECT TO authenticated USING (client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid()));

CREATE TABLE public.price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_price numeric NOT NULL,
  UNIQUE(price_list_id, product_id)
);
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage price_list_items" ON public.price_list_items FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Dealers view own price_list_items" ON public.price_list_items FOR SELECT TO authenticated USING (
  price_list_id IN (SELECT pl.id FROM price_lists pl WHERE pl.client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid()))
);
