
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage app settings" ON app_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated read app settings" ON app_settings
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO app_settings (key, value, description) VALUES
  ('notification_emails', '{"to": ["business@easysea.org", "gianluca@easysea.org"], "bcc": ["g.scotto@easysea.org"]}', 'Email recipients for order notifications'),
  ('company_info', '{"name": "Easysea", "support_email": "support@easysea.org"}', 'Company information displayed in emails')
ON CONFLICT (key) DO NOTHING;
