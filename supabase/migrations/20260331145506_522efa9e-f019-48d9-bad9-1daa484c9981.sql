
-- Create deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  stage TEXT NOT NULL DEFAULT 'qualification',
  probability INTEGER DEFAULT 20,
  expected_close_date DATE,
  assigned_to UUID,
  notes TEXT,
  closed_at TIMESTAMPTZ,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Sales and admin full access on deals" ON public.deals
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER set_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
