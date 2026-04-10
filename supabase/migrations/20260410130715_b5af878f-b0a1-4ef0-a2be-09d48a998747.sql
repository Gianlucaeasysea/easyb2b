
-- Table for storing OAuth CSRF state nonces
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nonce)
);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires 
  ON public.oauth_states(expires_at);

-- RLS: only service role can manage states (no user-facing policies)
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Add unique constraint on user_id for gmail_tokens if not exists
-- Drop the old unique on email, add unique on user_id
DO $$
BEGIN
  -- Check if unique constraint on user_id already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gmail_tokens_user_id_key' 
    AND conrelid = 'public.gmail_tokens'::regclass
  ) THEN
    ALTER TABLE public.gmail_tokens ADD CONSTRAINT gmail_tokens_user_id_key UNIQUE (user_id);
  END IF;
END $$;
