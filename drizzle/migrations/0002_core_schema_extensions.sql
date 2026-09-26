DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','suspended','deactivated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('unverified','pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.availability_status AS ENUM ('available','busy','unavailable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.price_type AS ENUM ('hourly','fixed','daily','negotiable','starting_from');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS profile_image text,
  ADD COLUMN IF NOT EXISTS status public.account_status NOT NULL DEFAULT 'active';
UPDATE public.profiles SET full_name = display_name WHERE full_name IS NULL;
UPDATE public.profiles SET profile_image = avatar_url WHERE profile_image IS NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_full_name_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_len CHECK (full_name IS NULL OR char_length(full_name) <= 120);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);

CREATE OR REPLACE FUNCTION private.guard_profile_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators can change account status';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_status ON public.profiles;
CREATE TRIGGER guard_profile_status BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.guard_profile_status();

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- CLIENT PROFILES
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS state text DEFAULT 'FCT',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS additional_info text;
CREATE INDEX IF NOT EXISTS client_profiles_city_idx ON public.client_profiles(state, city);

-- SUBCATEGORIES
CREATE TABLE IF NOT EXISTS public.service_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);
GRANT SELECT ON public.service_subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_subcategories TO authenticated;
GRANT ALL ON public.service_subcategories TO service_role;
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active subcategories" ON public.service_subcategories
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage subcategories" ON public.service_subcategories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX IF NOT EXISTS service_subcategories_category_idx ON public.service_subcategories(category_id, sort_order);
CREATE TRIGGER update_service_subcategories_updated_at BEFORE UPDATE ON public.service_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROVIDER PROFILES
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS state text DEFAULT 'FCT',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS availability_status public.availability_status NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS average_rating numeric GENERATED ALWAYS AS (rating_average) STORED;
UPDATE public.provider_profiles SET verification_status = 'verified' WHERE is_verified AND verification_status = 'unverified';
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_years_experience_range;
ALTER TABLE public.provider_profiles ADD CONSTRAINT provider_years_experience_range
  CHECK (years_experience IS NULL OR years_experience BETWEEN 0 AND 80) NOT VALID;
CREATE INDEX IF NOT EXISTS provider_profiles_location_idx ON public.provider_profiles(state, city, area) WHERE is_published;
CREATE INDEX IF NOT EXISTS provider_profiles_category_idx ON public.provider_profiles(category_id) WHERE is_published;
CREATE INDEX IF NOT EXISTS provider_profiles_rating_idx ON public.provider_profiles(rating_average DESC) WHERE is_published;

CREATE OR REPLACE FUNCTION private.guard_provider_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'unverified';
  ELSIF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    -- providers may only request verification
    IF NOT (OLD.verification_status IN ('unverified','rejected') AND NEW.verification_status = 'pending') THEN
      RAISE EXCEPTION 'Only administrators can change verification status';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_provider_verification ON public.provider_profiles;
CREATE TRIGGER guard_provider_verification BEFORE INSERT OR UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION private.guard_provider_verification();

-- PROVIDER SERVICES
ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.service_subcategories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_type public.price_type NOT NULL DEFAULT 'starting_from';
ALTER TABLE public.provider_services DROP CONSTRAINT IF EXISTS provider_services_price_nonneg;
ALTER TABLE public.provider_services ADD CONSTRAINT provider_services_price_nonneg
  CHECK (price_from IS NULL OR price_from >= 0) NOT VALID;
COMMENT ON COLUMN public.provider_services.title IS 'Service name';
COMMENT ON COLUMN public.provider_services.price_from IS 'Price; meaning depends on price_type';
COMMENT ON COLUMN public.provider_services.price_unit IS 'DEPRECATED: replaced by price_type';
CREATE INDEX IF NOT EXISTS provider_services_provider_idx ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS provider_services_category_idx ON public.provider_services(category_id, subcategory_id) WHERE is_active;

-- PORTFOLIOS: expose portfolio_items as provider_portfolios (RLS of base table applies)
CREATE OR REPLACE VIEW public.provider_portfolios WITH (security_invoker = true) AS
  SELECT id, provider_id, title, description, image_path, sort_order, created_at, updated_at
  FROM public.portfolio_items;
GRANT SELECT ON public.provider_portfolios TO anon, authenticated;
GRANT ALL ON public.provider_portfolios TO service_role;
CREATE INDEX IF NOT EXISTS portfolio_items_provider_idx ON public.portfolio_items(provider_id, sort_order);

-- Supporting indexes
CREATE UNIQUE INDEX IF NOT EXISTS saved_providers_unique_idx ON public.saved_providers(user_id, provider_id);
CREATE INDEX IF NOT EXISTS reviews_provider_idx ON public.reviews(provider_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;