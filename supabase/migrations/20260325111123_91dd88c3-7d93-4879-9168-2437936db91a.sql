-- Step 1: Drop old constraints
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_discount_class_check;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- Step 2: Migrate data
UPDATE public.clients SET discount_class = 'standard' WHERE discount_class = 'D' OR discount_class IS NULL;
UPDATE public.clients SET discount_class = 'bronze' WHERE discount_class = 'C';
UPDATE public.clients SET discount_class = 'silver' WHERE discount_class = 'B';
UPDATE public.clients SET discount_class = 'gold' WHERE discount_class = 'A';

-- Step 3: Add new constraints
ALTER TABLE public.clients ADD CONSTRAINT clients_discount_class_check 
  CHECK (discount_class = ANY (ARRAY['gold', 'silver', 'bronze', 'standard', 'custom']));
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check 
  CHECK (status = ANY (ARRAY['active', 'lead', 'inactive', 'onboarding', 'suspended']));