
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on automation_rules"
  ON public.automation_rules
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed 5 predefined rules
INSERT INTO public.automation_rules (name, description, trigger_type, trigger_config, action_type, action_config, is_active)
VALUES
  ('Prima chiamata nuovo lead', 'Crea automaticamente un task di prima chiamata quando viene creato un nuovo lead', 'lead_created', '{}', 'create_task', '{"title":"Prima chiamata","type":"call","priority":"high","due_days_offset":1}', true),
  ('Deal stallo negoziazione', 'Crea un task di follow-up quando un deal entra in fase negoziazione', 'deal_stage_changed', '{"to_stage":"negotiation"}', 'create_task', '{"title":"Follow-up negoziazione","type":"follow_up","priority":"medium","due_days_offset":14}', true),
  ('Cliente inattivo → at risk', 'Sposta il cliente ad at_risk quando inattivo da 60+ giorni', 'client_inactive_days', '{"days":60}', 'change_stage', '{"new_stage":"at_risk"}', true),
  ('Follow-up post ordine', 'Crea un task di follow-up dopo conferma ordine', 'order_status_changed', '{"to_status":"confirmed"}', 'create_task', '{"title":"Follow-up post ordine","type":"follow_up","priority":"medium","due_days_offset":7}', true),
  ('Reminder scadenza deal', 'Crea una notifica quando un deal è in scadenza tra 3 giorni', 'deal_close_date_approaching', '{"days_before":3}', 'create_notification', '{"title":"Deal in scadenza","body":"Il deal {{deal_title}} scade tra 3 giorni"}', true);
