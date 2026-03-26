CREATE TABLE public.client_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  template_type text NOT NULL DEFAULT 'custom',
  sent_by uuid NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales manage communications"
  ON public.client_communications FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales'));

CREATE POLICY "Dealers view own communications"
  ON public.client_communications FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid()));

CREATE INDEX idx_client_communications_client_id ON public.client_communications(client_id);
CREATE INDEX idx_client_communications_order_id ON public.client_communications(order_id);