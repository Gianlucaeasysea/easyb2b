
-- Add new columns to orders table for B2B order history
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost_client numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost_easysea numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payed_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text;

-- Remove the status check constraint if it exists, to allow all statuses from the sheet
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
