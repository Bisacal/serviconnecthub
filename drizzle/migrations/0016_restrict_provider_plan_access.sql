CREATE OR REPLACE FUNCTION private.provider_current_plan(_provider_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT s.plan_id FROM public.provider_subscriptions s
      WHERE s.provider_id = _provider_id AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY s.created_at DESC LIMIT 1),
    (SELECT id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1))
$function$;

CREATE OR REPLACE FUNCTION public.provider_current_plan(_provider_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = _provider_id AND p.user_id = auth.uid())
      OR private.has_role(auth.uid(), 'admin')
    ) THEN private.provider_current_plan(_provider_id)
    ELSE NULL
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.provider_current_plan(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.provider_current_plan(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.provider_visibility()
RETURNS TABLE(provider_id uuid, visibility_rank smallint, is_featured boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, sp.visibility_rank, sp.is_featured_placement
  FROM public.provider_profiles p
  JOIN public.subscription_plans sp ON sp.id = private.provider_current_plan(p.id)
  WHERE p.is_published
$function$;