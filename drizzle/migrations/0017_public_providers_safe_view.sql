CREATE VIEW public.public_providers
WITH (security_invoker = true) AS
SELECT
  id,
  public_name,
  business_name,
  profession,
  headline,
  bio,
  city,
  area,
  state,
  starting_price,
  rating_average,
  review_count,
  is_verified,
  years_experience,
  availability_status,
  category_id,
  created_at
FROM public.provider_profiles
WHERE is_published;

GRANT SELECT ON public.public_providers TO anon, authenticated;
GRANT SELECT ON public.public_providers TO service_role;

COMMENT ON VIEW public.public_providers IS 'Public-safe provider listing: published providers only, internal account identifiers (user_id) and private fields excluded.';