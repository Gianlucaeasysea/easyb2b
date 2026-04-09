
-- Rate limiting trigger for distributor_requests
CREATE OR REPLACE FUNCTION public.check_distributor_request_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.distributor_requests
  WHERE email = NEW.email
    AND created_at > (now() - interval '24 hours');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many requests from this email address. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_distributor_request_rate_limit_trigger ON distributor_requests;
CREATE TRIGGER check_distributor_request_rate_limit_trigger
  BEFORE INSERT ON distributor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_distributor_request_rate_limit();
