ALTER TABLE public.clients ADD COLUMN show_discount_tiers boolean NOT NULL DEFAULT true;
ALTER TABLE public.clients ADD COLUMN show_goals boolean NOT NULL DEFAULT true;