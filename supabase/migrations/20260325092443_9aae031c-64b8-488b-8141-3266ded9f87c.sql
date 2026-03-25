
-- Add business_type and website to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website text;

-- Create client_contacts table for multiple contacts per client
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  email text,
  phone text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_contacts" ON public.client_contacts
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales view client_contacts" ON public.client_contacts
  FOR SELECT TO public USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Dealers view own client_contacts" ON public.client_contacts
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
