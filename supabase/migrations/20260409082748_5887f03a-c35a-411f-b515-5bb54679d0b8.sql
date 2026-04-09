-- 1. Move pg_trgm extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION pg_trgm SCHEMA extensions;

-- 2. Remove duplicate overly-permissive distributor_requests policy
DROP POLICY IF EXISTS "Anyone can submit a dealer request" ON public.distributor_requests;

-- 3. Fix automation_logs INSERT policy - restrict to system/authenticated
DROP POLICY IF EXISTS "System insert automation logs" ON public.automation_logs;
CREATE POLICY "Authenticated users insert automation logs" ON public.automation_logs
FOR INSERT TO authenticated
WITH CHECK (true);
