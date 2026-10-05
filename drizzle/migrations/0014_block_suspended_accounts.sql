CREATE OR REPLACE FUNCTION private.account_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status = 'active' FROM public.profiles WHERE user_id = auth.uid()), true)
$$;
REVOKE EXECUTE ON FUNCTION private.account_is_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.account_is_active() TO authenticated;

DROP POLICY IF EXISTS "Active accounts only" ON public.service_requests;
CREATE POLICY "Active accounts only" ON public.service_requests AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.account_is_active());
DROP POLICY IF EXISTS "Active accounts only" ON public.bookings;
CREATE POLICY "Active accounts only" ON public.bookings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.account_is_active());
DROP POLICY IF EXISTS "Active accounts only" ON public.messages;
CREATE POLICY "Active accounts only" ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.account_is_active());
DROP POLICY IF EXISTS "Active accounts only" ON public.reviews;
CREATE POLICY "Active accounts only" ON public.reviews AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.account_is_active());
DROP POLICY IF EXISTS "Active accounts only" ON public.provider_services;
CREATE POLICY "Active accounts only" ON public.provider_services AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.account_is_active());