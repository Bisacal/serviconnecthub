CREATE OR REPLACE FUNCTION public.provider_visibility()
RETURNS TABLE(provider_id uuid, visibility_rank smallint, is_featured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, sp.visibility_rank, sp.is_featured_placement
  FROM public.provider_profiles p
  JOIN public.subscription_plans sp ON sp.id = public.provider_current_plan(p.id)
  WHERE p.is_published
$$;
GRANT EXECUTE ON FUNCTION public.provider_visibility() TO anon, authenticated;