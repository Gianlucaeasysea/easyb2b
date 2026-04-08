
CREATE OR REPLACE FUNCTION validate_order_status_transition() RETURNS TRIGGER AS $$
BEGIN
  -- Block changes from terminal states
  IF OLD.status IN ('cancelled', 'returned') AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'Cannot change status of a % order', OLD.status;
  END IF;

  -- Delivered orders can only become returned
  IF OLD.status = 'delivered' AND NEW.status NOT IN ('returned', 'delivered') THEN
    RAISE EXCEPTION 'Delivered orders can only be marked as returned';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_order_status_transition
BEFORE UPDATE OF status ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION validate_order_status_transition();
