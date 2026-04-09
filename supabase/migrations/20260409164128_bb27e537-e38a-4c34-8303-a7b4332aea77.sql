
-- Fix 1: Update doc_type constraint to include order_confirmation and delivery_note
ALTER TABLE order_documents DROP CONSTRAINT IF EXISTS order_documents_doc_type_check;
ALTER TABLE order_documents ADD CONSTRAINT order_documents_doc_type_check
  CHECK (doc_type IN ('order_confirmation', 'invoice', 'ddt', 'credit_note', 'proforma', 'delivery_note', 'warranty', 'other'));

-- Fix 3: Add payment_reminder_sent_at column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;

-- Fix 3: Trigger to auto-set payment_due_date on delivery
CREATE OR REPLACE FUNCTION public.set_payment_due_date()
RETURNS TRIGGER AS $$
DECLARE
  client_terms text;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    SELECT payment_terms INTO client_terms FROM public.clients WHERE id = NEW.client_id;
    IF client_terms = 'Net 30' OR client_terms = '30_days' THEN
      NEW.payment_due_date = CURRENT_DATE + INTERVAL '30 days';
    ELSIF client_terms = 'Net 60' OR client_terms = '60_days' THEN
      NEW.payment_due_date = CURRENT_DATE + INTERVAL '60 days';
    ELSIF client_terms = '100% upfront' OR client_terms = 'prepaid' THEN
      NEW.payment_due_date = CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_payment_due ON public.orders;
CREATE TRIGGER set_payment_due
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_payment_due_date();
