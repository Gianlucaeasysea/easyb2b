
-- Table to store Gmail OAuth tokens
CREATE TABLE public.gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  email text NOT NULL DEFAULT 'business@easysea.org',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gmail_tokens" ON public.gmail_tokens
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add direction column to client_communications
ALTER TABLE public.client_communications
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS gmail_message_id text,
  ADD COLUMN IF NOT EXISTS gmail_thread_id text;

CREATE INDEX IF NOT EXISTS idx_client_comms_gmail_msg ON public.client_communications(gmail_message_id);
