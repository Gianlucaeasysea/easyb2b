-- Enhance client_contacts table with new columns
ALTER TABLE client_contacts
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add contact_id to activities
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES client_contacts(id);

-- Add contact_id to client_communications
ALTER TABLE client_communications
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES client_contacts(id);