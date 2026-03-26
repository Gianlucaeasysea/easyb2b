
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers view own notifications"
  ON public.client_notifications FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Dealers update own notifications"
  ON public.client_notifications FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage notifications"
  ON public.client_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operations manage notifications"
  ON public.client_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operations'::app_role));
