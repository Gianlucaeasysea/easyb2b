
-- Drop old constraint FIRST
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_discount_class_check;

-- Migrate existing data
UPDATE public.clients SET discount_class = 'A' WHERE discount_class = 'gold';
UPDATE public.clients SET discount_class = 'B' WHERE discount_class = 'silver';
UPDATE public.clients SET discount_class = 'C' WHERE discount_class = 'bronze';
UPDATE public.clients SET discount_class = 'D' WHERE discount_class = 'standard';
UPDATE public.clients SET discount_class = 'D' WHERE discount_class IS NULL;

-- Add new constraint
ALTER TABLE public.clients ADD CONSTRAINT clients_discount_class_check 
  CHECK (discount_class = ANY (ARRAY['A', 'B', 'C', 'D', 'custom']));

-- Link dealer test user to EASYSEA 8 client  
UPDATE public.clients 
SET user_id = '94bc53de-14cb-446e-a41b-08387b8d749d',
    payment_terms = '30_days'
WHERE id = '3659dc11-a3dc-44de-a8a9-9a29518fcd83';

-- Link client to price list
INSERT INTO public.price_list_clients (client_id, price_list_id)
VALUES ('3659dc11-a3dc-44de-a8a9-9a29518fcd83', '1b66b5d5-26cf-4197-85de-5fec95910881')
ON CONFLICT DO NOTHING;
