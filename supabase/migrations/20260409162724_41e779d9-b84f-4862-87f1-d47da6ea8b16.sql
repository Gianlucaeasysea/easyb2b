
-- Step 1: Drop old constraint FIRST
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_check;

-- Step 2: Migrate existing deals to new stages
UPDATE deals SET stage = 'draft' WHERE stage IN ('new', 'qualification', 'proposal');
UPDATE deals SET stage = 'confirmed' WHERE stage = 'negotiation';

-- Step 3: Add new constraint
ALTER TABLE deals ADD CONSTRAINT deals_stage_check
  CHECK (stage IN ('draft', 'confirmed', 'closed_won', 'closed_lost'));

-- Step 4: Auto-create deal from draft order + sync stage
CREATE OR REPLACE FUNCTION auto_create_deal_from_draft_order()
RETURNS TRIGGER AS $$
DECLARE
  existing_deal_id uuid;
BEGIN
  IF NEW.status = 'draft' AND NEW.client_id IS NOT NULL THEN
    SELECT id INTO existing_deal_id FROM deals WHERE order_id = NEW.id;
    IF existing_deal_id IS NULL THEN
      INSERT INTO deals (title, client_id, order_id, stage, value, source, created_at, updated_at)
      VALUES (
        'Draft Order — ' || COALESCE(NEW.order_code, NEW.id::text),
        NEW.client_id,
        NEW.id,
        'draft',
        COALESCE(NEW.total_amount, 0),
        'order',
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status IN ('submitted', 'confirmed') THEN
    UPDATE deals SET stage = 'confirmed', updated_at = NOW()
    WHERE order_id = NEW.id AND stage = 'draft';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'delivered' THEN
    UPDATE deals SET stage = 'closed_won', closed_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND stage NOT IN ('closed_won', 'closed_lost');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN
    UPDATE deals SET stage = 'closed_lost', closed_at = NOW(), updated_at = NOW()
    WHERE order_id = NEW.id AND stage NOT IN ('closed_won', 'closed_lost');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_deal_from_order ON orders;
CREATE TRIGGER auto_deal_from_order
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_create_deal_from_draft_order();

-- Step 5: Sync deal value when order total changes
CREATE OR REPLACE FUNCTION sync_deal_value_from_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    UPDATE deals SET value = NEW.total_amount, updated_at = NOW()
    WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_deal_value ON orders;
CREATE TRIGGER sync_deal_value
  AFTER UPDATE OF total_amount ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_deal_value_from_order();

-- Step 6: Backfill deals for existing draft orders
INSERT INTO deals (title, client_id, order_id, stage, value, source, created_at, updated_at)
SELECT
  'Draft Order — ' || COALESCE(o.order_code, o.id::text),
  o.client_id,
  o.id,
  'draft',
  COALESCE(o.total_amount, 0),
  'order',
  o.created_at,
  NOW()
FROM orders o
WHERE o.status = 'draft'
  AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.order_id = o.id);
