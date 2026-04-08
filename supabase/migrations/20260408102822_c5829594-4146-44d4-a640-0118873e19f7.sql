ALTER TABLE public.distributor_requests DROP CONSTRAINT IF EXISTS distributor_requests_status_check;

ALTER TABLE public.distributor_requests
ADD CONSTRAINT distributor_requests_status_check
CHECK (status = ANY (ARRAY['new'::text, 'reviewed'::text, 'approved'::text, 'rejected'::text, 'converted'::text]));