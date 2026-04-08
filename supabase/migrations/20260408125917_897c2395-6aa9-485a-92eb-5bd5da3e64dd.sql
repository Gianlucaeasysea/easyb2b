
-- Drop existing constraints FIRST
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Normalize order status
UPDATE public.orders SET status = 'processing' WHERE status = 'To be prepared';
UPDATE public.orders SET status = 'ready_to_ship' WHERE status = 'Ready';
UPDATE public.orders SET status = 'shipped' WHERE status = 'On the road';
UPDATE public.orders SET status = 'delivered' WHERE status = 'Delivered';
UPDATE public.orders SET status = 'returned' WHERE status = 'Returned';
UPDATE public.orders SET status = 'confirmed' WHERE status = 'submitted';
-- "Payed" as order status → delivered
UPDATE public.orders SET status = 'delivered' WHERE status = 'Payed';
-- "lost" as order status → cancelled
UPDATE public.orders SET status = 'cancelled' WHERE status = 'lost';

-- Normalize payment status
UPDATE public.orders SET payment_status = 'paid' WHERE payment_status = 'Payed';
UPDATE public.orders SET payment_status = 'unpaid' WHERE payment_status = 'To be paid';
-- "lost" in payment_status → set to unpaid
UPDATE public.orders SET payment_status = 'unpaid' WHERE payment_status = 'lost';
-- Any other non-standard payment_status → unpaid
UPDATE public.orders SET payment_status = 'unpaid' WHERE payment_status IS NOT NULL AND payment_status NOT IN ('unpaid', 'pending', 'paid');

-- Add constraints
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('draft', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'returned'));

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'pending', 'paid'));
