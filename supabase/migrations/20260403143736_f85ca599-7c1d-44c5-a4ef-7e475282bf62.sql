CREATE POLICY "Anyone can submit a dealer request"
ON public.distributor_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);