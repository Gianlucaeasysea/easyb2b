
-- Table for client-specific downloadable documents (contracts, price lists, marketing materials)
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  doc_category text NOT NULL DEFAULT 'other',
  description text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins manage client_documents"
  ON public.client_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Sales can view
CREATE POLICY "Sales view client_documents"
  ON public.client_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role));

-- Dealers view own documents
CREATE POLICY "Dealers view own client_documents"
  ON public.client_documents FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload
CREATE POLICY "Admins upload client documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage RLS: admins can delete
CREATE POLICY "Admins delete client documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage RLS: authenticated can read (public bucket)
CREATE POLICY "Authenticated read client documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents');
