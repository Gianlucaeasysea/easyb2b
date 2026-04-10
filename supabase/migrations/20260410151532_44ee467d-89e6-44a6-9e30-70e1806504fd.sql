
-- =============================================
-- FIX 1: Atomic delete_client_cascade RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.delete_client_cascade(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_orders INT;
  v_order_ids UUID[];
BEGIN
  -- Only admin can delete
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete client';
  END IF;

  -- Get linked user_id
  SELECT user_id INTO v_user_id FROM clients WHERE id = p_client_id;

  -- Collect order IDs
  SELECT ARRAY_AGG(id) INTO v_order_ids FROM orders WHERE client_id = p_client_id;

  -- Delete order children
  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM order_items WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_documents WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_events WHERE order_id = ANY(v_order_ids);
  END IF;

  -- Delete orders
  DELETE FROM orders WHERE client_id = p_client_id;
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;

  -- Delete related records
  DELETE FROM tasks WHERE client_id = p_client_id;
  DELETE FROM deals WHERE client_id = p_client_id;
  DELETE FROM activities WHERE client_id = p_client_id;
  DELETE FROM client_bank_details WHERE client_id = p_client_id;
  DELETE FROM client_notifications WHERE client_id = p_client_id;
  DELETE FROM client_notification_preferences WHERE client_id = p_client_id;
  DELETE FROM client_documents WHERE client_id = p_client_id;
  DELETE FROM client_shipping_addresses WHERE client_id = p_client_id;
  DELETE FROM price_list_clients WHERE client_id = p_client_id;
  DELETE FROM price_lists WHERE client_id = p_client_id;
  DELETE FROM client_communications WHERE client_id = p_client_id;
  DELETE FROM client_contacts WHERE client_id = p_client_id;

  -- Delete the client
  DELETE FROM clients WHERE id = p_client_id;

  -- Audit log
  INSERT INTO audit_logs (action, table_name, record_id, changed_by, new_data)
  VALUES (
    'delete_cascade',
    'clients',
    p_client_id,
    auth.uid(),
    jsonb_build_object(
      'deleted_orders', v_deleted_orders,
      'had_dealer_account', v_user_id IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_orders', v_deleted_orders,
    'had_dealer_account', v_user_id IS NOT NULL,
    'dealer_user_id', v_user_id
  );
END;
$$;

-- =============================================
-- FIX 4: Missing FK indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);

CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
