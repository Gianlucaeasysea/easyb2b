
CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_events"
  ON public.order_events
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers read own order events"
  ON public.order_events
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Seed events for existing orders based on their current status
INSERT INTO public.order_events (order_id, event_type, title, description, created_at)
SELECT id, 'order_created', 'Ordine creato', 'L''ordine è stato inserito nel sistema', created_at
FROM public.orders;

INSERT INTO public.order_events (order_id, event_type, title, description, created_at)
SELECT id, 'status_change', 'Stato aggiornato: ' || COALESCE(status, 'draft'), NULL, updated_at
FROM public.orders WHERE status IS NOT NULL AND status != 'confirmed';
