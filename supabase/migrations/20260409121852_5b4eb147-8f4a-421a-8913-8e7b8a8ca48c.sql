
-- Fix 1: distributor_requests SELECT policy - restrict to authenticated only  
DROP POLICY IF EXISTS "Admins view requests" ON public.distributor_requests;
DROP POLICY IF EXISTS "Admins and sales view requests" ON public.distributor_requests;

CREATE POLICY "Admins and sales view requests"
ON public.distributor_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
);

-- Fix 2: dealer notification preferences - allow dealers to manage their own
DROP POLICY IF EXISTS "Dealers insert own notification preferences" ON public.client_notification_preferences;
DROP POLICY IF EXISTS "Dealers update own notification preferences" ON public.client_notification_preferences;

CREATE POLICY "Dealers insert own notification preferences"
ON public.client_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

CREATE POLICY "Dealers update own notification preferences"
ON public.client_notification_preferences
FOR UPDATE
TO authenticated
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
)
WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Fix 3: Improve realtime - role-based access
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Scoped realtime access" ON realtime.messages;

CREATE POLICY "Role based realtime access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
  OR has_role(auth.uid(), 'dealer'::app_role)
);
