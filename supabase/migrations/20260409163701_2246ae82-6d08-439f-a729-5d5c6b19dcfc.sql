
-- FIX 1: Set default payment_terms to '100% upfront'
ALTER TABLE clients ALTER COLUMN payment_terms SET DEFAULT '100% upfront';

-- Update existing clients that have NULL or empty payment_terms
UPDATE clients SET payment_terms = '100% upfront' WHERE payment_terms IS NULL OR payment_terms = '';

-- Also update the validate_payment_terms function to accept the new value
CREATE OR REPLACE FUNCTION public.validate_payment_terms()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_terms IS NOT NULL AND NEW.payment_terms NOT IN ('100% upfront', 'prepaid', '30_days', '60_days', '90_days', 'end_of_month', 'Net 30', 'Net 60', '50/50', 'Custom') THEN
    RAISE EXCEPTION 'Invalid payment_terms value: %', NEW.payment_terms;
  END IF;
  RETURN NEW;
END;
$function$;
