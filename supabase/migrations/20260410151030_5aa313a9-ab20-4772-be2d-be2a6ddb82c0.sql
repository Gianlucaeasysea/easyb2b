
-- =============================================
-- FIX 2: RLS on activities
-- =============================================
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on activities"
  ON public.activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Sales access assigned activities"
  ON public.activities FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'sales'::public.app_role)
    AND (
      (client_id IS NOT NULL AND client_id IN (
        SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid()
      ))
      OR
      (lead_id IS NOT NULL AND lead_id IN (
        SELECT id FROM public.leads WHERE assigned_to = auth.uid()
      ))
      OR
      created_by = auth.uid()
    )
  )
  WITH CHECK (public.has_role(auth.uid(), 'sales'::public.app_role));

CREATE POLICY "Operations read activities"
  ON public.activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operations'::public.app_role));

-- =============================================
-- FIX 3: RLS on tasks - add dealer + sales insert
-- =============================================
CREATE POLICY "Dealer view own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'dealer'::public.app_role)
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Sales create tasks on assigned clients"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'sales'::public.app_role)
    AND (
      client_id IS NULL
      OR client_id IN (SELECT id FROM public.clients WHERE assigned_sales_id = auth.uid())
    )
  );

-- =============================================
-- FIX 4: RLS on automation_rules
-- =============================================
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Sales read automation_rules"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sales'::public.app_role));

-- =============================================
-- FIX 5: RLS email_templates - admin only modify
-- =============================================
DROP POLICY IF EXISTS "Sales manage email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin and sales email_templates" ON public.email_templates;

CREATE POLICY "Admin manage email_templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Sales read email_templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sales'::public.app_role));
