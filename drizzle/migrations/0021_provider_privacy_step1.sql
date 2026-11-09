CREATE ROLE public_provider_reader NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE;
GRANT public_provider_reader TO postgres WITH SET TRUE, INHERIT FALSE;
GRANT USAGE ON SCHEMA public TO public_provider_reader;
GRANT SELECT (id, public_name, business_name, profession, headline, bio, city, area, state, starting_price, rating_average, review_count, is_verified, years_experience, availability_status, category_id, created_at, is_published) ON public.provider_profiles TO public_provider_reader;
CREATE POLICY "Public reader sees published" ON public.provider_profiles FOR SELECT TO public_provider_reader USING (is_published);
ALTER VIEW public.public_providers SET (security_invoker = false);
GRANT CREATE ON SCHEMA public TO public_provider_reader;
ALTER VIEW public.public_providers OWNER TO public_provider_reader;
REVOKE CREATE ON SCHEMA public FROM public_provider_reader;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.public_providers FROM anon, authenticated;
GRANT SELECT ON public.public_providers TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.participant_provider_names(_provider_ids uuid[])
RETURNS TABLE(id uuid, public_name text, business_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.public_name, p.business_name FROM public.provider_profiles p
  WHERE auth.uid() IS NOT NULL AND p.id = ANY(_provider_ids) AND (
    p.user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.service_requests r WHERE r.provider_id = p.id AND r.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.provider_id = p.id AND b.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.reviews v WHERE v.provider_id = p.id AND v.client_id = auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.participant_provider_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.participant_provider_names(uuid[]) TO authenticated;