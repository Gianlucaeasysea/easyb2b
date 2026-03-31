
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and sales full access on email_templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role)
);

ALTER TABLE public.client_communications
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
