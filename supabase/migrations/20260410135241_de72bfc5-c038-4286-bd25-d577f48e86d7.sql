-- Add explicit RLS policies to oauth_states (currently RLS enabled but no policies)
CREATE POLICY "Users read own oauth states"
  ON public.oauth_states
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own oauth states"
  ON public.oauth_states
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own oauth states"
  ON public.oauth_states
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());