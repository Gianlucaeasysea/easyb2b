ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'unpaid';
UPDATE public.orders SET payment_status = 'unpaid' WHERE payment_status IS NULL OR payment_status = '';