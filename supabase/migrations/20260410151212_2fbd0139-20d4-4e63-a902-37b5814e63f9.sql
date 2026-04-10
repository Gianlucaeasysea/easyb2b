
-- =============================================
-- FIX: Add deal_id to activities
-- =============================================
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON public.activities(deal_id);

-- Backfill: link existing activities to deals via lead_id
UPDATE public.activities a
SET deal_id = d.id
FROM public.deals d
WHERE a.lead_id = d.lead_id
  AND a.deal_id IS NULL
  AND d.lead_id IS NOT NULL;

-- =============================================
-- FIX: Add is_primary to price_list_clients
-- =============================================
ALTER TABLE public.price_list_clients
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Ensure at most one primary per client
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_list_clients_primary
  ON public.price_list_clients(client_id)
  WHERE is_primary = true;

-- Backfill: set first price list per client as primary
WITH ranked AS (
  SELECT id, client_id,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at) as rn
  FROM public.price_list_clients
)
UPDATE public.price_list_clients plc
SET is_primary = true
FROM ranked r
WHERE plc.id = r.id AND r.rn = 1;
