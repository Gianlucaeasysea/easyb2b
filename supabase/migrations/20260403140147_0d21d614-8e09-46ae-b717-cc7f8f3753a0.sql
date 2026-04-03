
CREATE TABLE public.platform_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  level text NOT NULL DEFAULT 'minor',
  status text NOT NULL DEFAULT 'completed',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on changelog" ON public.platform_changelog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales read changelog" ON public.platform_changelog
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role));
