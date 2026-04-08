
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS note TEXT;

-- Drop existing check if any, then add proper one
DO $$
BEGIN
  ALTER TABLE order_documents DROP CONSTRAINT IF EXISTS order_documents_doc_type_check;
  ALTER TABLE order_documents ADD CONSTRAINT order_documents_doc_type_check
    CHECK (doc_type IN ('invoice', 'ddt', 'credit_note', 'proforma', 'other'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_documents_order ON order_documents(order_id);
