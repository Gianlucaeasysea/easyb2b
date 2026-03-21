-- Fix: make distributor_requests insert policy explicit for anon role
DROP POLICY "Anyone can submit" ON public.distributor_requests;
CREATE POLICY "Anyone can submit dealer request" ON public.distributor_requests FOR INSERT TO anon, authenticated WITH CHECK (true);