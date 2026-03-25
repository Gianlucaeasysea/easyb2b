
-- Auto-generate order_code on insert (format: ES-0001, ES-0002, ...)
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN order_code ~ '^ES-[0-9]+$' 
           THEN CAST(SUBSTRING(order_code FROM 4) AS integer) 
           ELSE 0 END
    ), 0) + 1
    INTO next_num
    FROM public.orders;
    
    NEW.order_code := 'ES-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_order_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_code();
