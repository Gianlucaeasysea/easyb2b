
ALTER TABLE client_communications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS error_details TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_communications_idempotency_key
  ON client_communications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
