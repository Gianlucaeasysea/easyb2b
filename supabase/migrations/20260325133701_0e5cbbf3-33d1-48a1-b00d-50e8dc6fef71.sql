-- Enable realtime for orders table (for admin notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Marketing materials table for admin-uploaded files
CREATE TABLE public.marketing_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing_materials" ON public.marketing_materials
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Dealers view marketing_materials" ON public.marketing_materials
  FOR SELECT TO authenticated USING (true);

-- Storage bucket for marketing materials
INSERT INTO storage.buckets (id, name, public) VALUES ('marketing-materials', 'marketing-materials', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admins upload marketing materials" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'marketing-materials' AND (SELECT has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins delete marketing materials" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'marketing-materials' AND (SELECT has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Anyone can read marketing materials" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'marketing-materials');

-- Client shipping addresses table
CREATE TABLE public.client_shipping_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Main',
  address_line text,
  city text,
  province text,
  postal_code text,
  country text,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_shipping_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shipping addresses" ON public.client_shipping_addresses
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Dealers manage own shipping addresses" ON public.client_shipping_addresses
  FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Client bank details table
CREATE TABLE public.client_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bank_name text,
  iban text,
  swift_bic text,
  account_holder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bank details" ON public.client_bank_details
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Dealers manage own bank details" ON public.client_bank_details
  FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));