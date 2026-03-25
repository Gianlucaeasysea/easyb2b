
CREATE TABLE public.client_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, notification_type)
);

ALTER TABLE public.client_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on notification prefs"
  ON public.client_notification_preferences
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers read own notification prefs"
  ON public.client_notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  );
