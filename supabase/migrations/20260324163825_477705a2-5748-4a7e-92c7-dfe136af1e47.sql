-- Create order_documents table
CREATE TABLE public.order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

-- Admins/ops full access
CREATE POLICY "Admins manage order documents"
ON public.order_documents
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')
);

-- Dealers can view documents for their own orders
CREATE POLICY "Dealers view own order documents"
ON public.order_documents
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM orders o
    WHERE o.client_id IN (
      SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
    )
  )
);

-- Create storage bucket for order documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', true);

-- Storage policies: admins can upload
CREATE POLICY "Admins upload order documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-documents' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')
  )
);

-- Anyone authenticated can read order documents
CREATE POLICY "Authenticated read order documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-documents');

-- Admins can delete order documents
CREATE POLICY "Admins delete order documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-documents' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operations')
  )
);