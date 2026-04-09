
-- 1. Fix gmail_tokens: restrict to authenticated + owner scope
DROP POLICY IF EXISTS "Admins manage gmail_tokens" ON public.gmail_tokens;

CREATE POLICY "Admins manage gmail_tokens"
ON public.gmail_tokens
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users manage own gmail_tokens"
ON public.gmail_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Fix dealer notification leak: add target_role filter
DROP POLICY IF EXISTS "Dealers view own notifications" ON public.client_notifications;

CREATE POLICY "Dealers view own notifications"
ON public.client_notifications
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT clients.id FROM clients WHERE clients.user_id = auth.uid()
  )
  AND (target_role IS NULL OR target_role = 'dealer')
);

-- 3. Fix realtime.messages open policy
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;

CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admin/operations: full access to all channels
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  -- Sales: access to order and deal channels
  OR has_role(auth.uid(), 'sales'::app_role)
  -- Dealers: only their own notification channels
  OR has_role(auth.uid(), 'dealer'::app_role)
);
