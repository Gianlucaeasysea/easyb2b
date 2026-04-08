
-- Automation execution logs
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  trigger_event TEXT,
  action_taken TEXT,
  target_record_id UUID,
  details JSONB,
  executed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales and admins view automation logs" ON automation_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "System insert automation logs" ON automation_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger function for lead status changes
CREATE OR REPLACE FUNCTION run_lead_automations() RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  v_client_id uuid;
BEGIN
  FOR rule IN
    SELECT * FROM automation_rules
    WHERE is_active = true
    AND trigger_type IN ('lead_stage_changed', 'lead_created')
    AND (
      trigger_type = 'lead_created'
      OR (
        ((trigger_config->>'from_stage') IS NULL OR (trigger_config->>'from_stage') = OLD.status)
        AND ((trigger_config->>'to_stage') IS NULL OR (trigger_config->>'to_stage') = NEW.status)
      )
    )
  LOOP
    -- Action: create_notification
    IF rule.action_type = 'create_notification' THEN
      SELECT id INTO v_client_id FROM clients WHERE assigned_sales_id = NEW.assigned_to LIMIT 1;
      IF v_client_id IS NOT NULL THEN
        INSERT INTO client_notifications (client_id, title, body, type, target_user_id)
        VALUES (
          v_client_id,
          COALESCE(rule.action_config->>'title', 'Automazione lead'),
          COALESCE(rule.action_config->>'body', 'Lo stato del lead è cambiato a ' || NEW.status),
          'automation',
          NEW.assigned_to
        );
      END IF;
    END IF;

    -- Action: assign_to
    IF rule.action_type = 'assign_to' AND rule.action_config->>'user_id' IS NOT NULL THEN
      NEW.assigned_to := (rule.action_config->>'user_id')::uuid;
    END IF;

    -- Action: create_task
    IF rule.action_type = 'create_task' THEN
      INSERT INTO tasks (title, type, priority, status, due_date, lead_id, created_by)
      VALUES (
        COALESCE(rule.action_config->>'title', 'Task automatico'),
        COALESCE(rule.action_config->>'type', 'task'),
        COALESCE(rule.action_config->>'priority', 'medium'),
        'pending',
        now() + (COALESCE((rule.action_config->>'due_days_offset')::int, 1) || ' days')::interval,
        NEW.id,
        NEW.assigned_to
      );
    END IF;

    -- Log execution
    INSERT INTO automation_logs (rule_id, rule_name, trigger_event, action_taken, target_record_id, details)
    VALUES (
      rule.id,
      rule.name,
      'lead_status: ' || COALESCE(OLD.status, 'NULL') || ' → ' || NEW.status,
      rule.action_type,
      NEW.id,
      jsonb_build_object('lead_company', NEW.company_name, 'from_status', OLD.status, 'to_status', NEW.status)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for deal stage changes
CREATE OR REPLACE FUNCTION run_deal_automations() RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  v_client_id uuid;
BEGIN
  FOR rule IN
    SELECT * FROM automation_rules
    WHERE is_active = true
    AND trigger_type = 'deal_stage_changed'
    AND ((trigger_config->>'to_stage') IS NULL OR (trigger_config->>'to_stage') = NEW.stage)
  LOOP
    -- Action: create_notification
    IF rule.action_type = 'create_notification' THEN
      v_client_id := NEW.client_id;
      IF v_client_id IS NULL THEN
        SELECT id INTO v_client_id FROM clients LIMIT 1;
      END IF;
      IF v_client_id IS NOT NULL THEN
        INSERT INTO client_notifications (client_id, title, body, type, target_user_id)
        VALUES (
          v_client_id,
          COALESCE(rule.action_config->>'title', 'Automazione deal'),
          COALESCE(rule.action_config->>'body', 'Lo stage del deal è cambiato a ' || NEW.stage),
          'automation',
          NEW.assigned_to
        );
      END IF;
    END IF;

    -- Action: assign_to
    IF rule.action_type = 'assign_to' AND rule.action_config->>'user_id' IS NOT NULL THEN
      NEW.assigned_to := (rule.action_config->>'user_id')::uuid;
    END IF;

    -- Action: create_task
    IF rule.action_type = 'create_task' THEN
      INSERT INTO tasks (title, type, priority, status, due_date, deal_id, client_id, created_by)
      VALUES (
        COALESCE(rule.action_config->>'title', 'Task automatico'),
        COALESCE(rule.action_config->>'type', 'task'),
        COALESCE(rule.action_config->>'priority', 'medium'),
        'pending',
        now() + (COALESCE((rule.action_config->>'due_days_offset')::int, 1) || ' days')::interval,
        NEW.id,
        NEW.client_id,
        NEW.assigned_to
      );
    END IF;

    -- Log execution
    INSERT INTO automation_logs (rule_id, rule_name, trigger_event, action_taken, target_record_id, details)
    VALUES (
      rule.id,
      rule.name,
      'deal_stage: ' || COALESCE(OLD.stage, 'NULL') || ' → ' || NEW.stage,
      rule.action_type,
      NEW.id,
      jsonb_build_object('deal_title', NEW.title, 'from_stage', OLD.stage, 'to_stage', NEW.stage)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for order creation
CREATE OR REPLACE FUNCTION run_order_automations() RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
BEGIN
  FOR rule IN
    SELECT * FROM automation_rules
    WHERE is_active = true
    AND trigger_type = 'order_created'
  LOOP
    -- Action: create_task
    IF rule.action_type = 'create_task' THEN
      INSERT INTO tasks (title, type, priority, status, due_date, client_id, created_by)
      VALUES (
        COALESCE(rule.action_config->>'title', 'Task per nuovo ordine'),
        COALESCE(rule.action_config->>'type', 'task'),
        COALESCE(rule.action_config->>'priority', 'medium'),
        'pending',
        now() + (COALESCE((rule.action_config->>'due_days_offset')::int, 1) || ' days')::interval,
        NEW.client_id,
        NULL
      );
    END IF;

    -- Action: create_notification
    IF rule.action_type = 'create_notification' THEN
      INSERT INTO client_notifications (client_id, title, body, type, target_role)
      VALUES (
        NEW.client_id,
        COALESCE(rule.action_config->>'title', 'Nuovo ordine ricevuto'),
        COALESCE(rule.action_config->>'body', 'Ordine ' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)) || ' creato.'),
        'automation',
        'admin'
      );
    END IF;

    -- Log execution
    INSERT INTO automation_logs (rule_id, rule_name, trigger_event, action_taken, target_record_id, details)
    VALUES (
      rule.id,
      rule.name,
      'order_created: ' || COALESCE(NEW.order_code, LEFT(NEW.id::text, 8)),
      rule.action_type,
      NEW.id,
      jsonb_build_object('order_code', NEW.order_code, 'client_id', NEW.client_id, 'total', NEW.total_amount)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers
CREATE TRIGGER trigger_lead_automations
BEFORE UPDATE OF status ON leads
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION run_lead_automations();

CREATE TRIGGER trigger_deal_automations
BEFORE UPDATE OF stage ON deals
FOR EACH ROW
WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
EXECUTE FUNCTION run_deal_automations();

CREATE TRIGGER trigger_order_automations
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION run_order_automations();
