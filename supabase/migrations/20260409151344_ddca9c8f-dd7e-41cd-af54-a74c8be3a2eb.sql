
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_stage_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_stage_check
  CHECK (stage IN ('new','qualification','proposal','negotiation','closed_won','closed_lost'));
