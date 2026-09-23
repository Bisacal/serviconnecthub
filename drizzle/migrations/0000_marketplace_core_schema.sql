-- Additive only: no existing tables or data are dropped.
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS public_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS provider_profiles_category_idx ON public.provider_profiles(category_id);

CREATE OR REPLACE FUNCTION private.protect_provider_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT private.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_verified := false; NEW.rating_average := 0; NEW.review_count := 0;
    ELSE
      NEW.is_verified := OLD.is_verified;
      NEW.rating_average := OLD.rating_average;
      NEW.review_count := OLD.review_count;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_provider_fields ON public.provider_profiles;
CREATE TRIGGER protect_provider_fields BEFORE INSERT OR UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION private.protect_provider_fields();

CREATE OR REPLACE FUNCTION private.owns_provider(_provider_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = _provider_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION private.provider_is_published(_provider_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = _provider_id AND is_published)
$$;
GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.owns_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.provider_is_published(UUID) TO anon, authenticated;

CREATE TABLE public.provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_from NUMERIC(12,2),
  price_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.provider_services(provider_id);
CREATE INDEX ON public.provider_services(category_id);
GRANT SELECT ON public.provider_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT ALL ON public.provider_services TO service_role;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active services of published providers" ON public.provider_services FOR SELECT TO anon, authenticated USING (is_active AND private.provider_is_published(provider_id));
CREATE POLICY "Providers manage own services" ON public.provider_services FOR ALL TO authenticated USING (private.owns_provider(provider_id)) WITH CHECK (private.owns_provider(provider_id));
CREATE POLICY "Admins manage services" ON public.provider_services FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_provider_services_updated_at BEFORE UPDATE ON public.provider_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.request_status AS ENUM ('pending','accepted','declined','in_progress','completed','cancelled');
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.provider_services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT,
  location TEXT,
  preferred_date DATE,
  budget NUMERIC(12,2),
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.service_requests(client_id);
CREATE INDEX ON public.service_requests(provider_id);
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients view own requests" ON public.service_requests FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Providers view requests sent to them" ON public.service_requests FOR SELECT TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Admins view all requests" ON public.service_requests FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Clients create requests to published providers" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id AND status = 'pending' AND private.provider_is_published(provider_id) AND NOT private.owns_provider(provider_id));
CREATE POLICY "Clients update own requests" ON public.service_requests FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Providers update their requests" ON public.service_requests FOR UPDATE TO authenticated USING (private.owns_provider(provider_id)) WITH CHECK (private.owns_provider(provider_id));
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION private.guard_request_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE is_client BOOLEAN := auth.uid() = OLD.client_id;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  NEW.client_id := OLD.client_id; NEW.provider_id := OLD.provider_id; NEW.created_at := OLD.created_at;
  IF NEW.status <> OLD.status THEN
    IF is_client AND NEW.status <> 'cancelled' THEN RAISE EXCEPTION 'Clients can only cancel requests'; END IF;
    IF NOT is_client AND NEW.status NOT IN ('accepted','declined','in_progress','completed') THEN RAISE EXCEPTION 'Invalid status change'; END IF;
  END IF;
  IF NOT is_client THEN
    NEW.title := OLD.title; NEW.details := OLD.details; NEW.location := OLD.location;
    NEW.preferred_date := OLD.preferred_date; NEW.budget := OLD.budget; NEW.service_id := OLD.service_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER guard_request_update BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION private.guard_request_update();

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reviews(provider_id);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION private.can_review(_request_id UUID, _provider_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.service_requests WHERE id = _request_id AND provider_id = _provider_id AND client_id = auth.uid() AND status = 'completed')
$$;
GRANT EXECUTE ON FUNCTION private.can_review(UUID, UUID) TO authenticated;
CREATE POLICY "Public can view visible reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (NOT is_hidden AND private.provider_is_published(provider_id));
CREATE POLICY "Clients view own reviews" ON public.reviews FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Clients review completed requests" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id AND is_hidden = false AND private.can_review(request_id, provider_id));
CREATE POLICY "Clients edit own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Admins moderate reviews" ON public.reviews FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION private.guard_review_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT private.has_role(auth.uid(),'admin') THEN
    NEW.is_hidden := OLD.is_hidden; NEW.request_id := OLD.request_id; NEW.provider_id := OLD.provider_id; NEW.client_id := OLD.client_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER guard_review_update BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.guard_review_update();

CREATE OR REPLACE FUNCTION private.refresh_provider_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid UUID := COALESCE(NEW.provider_id, OLD.provider_id);
BEGIN
  UPDATE public.provider_profiles p SET
    rating_average = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE provider_id = pid AND NOT is_hidden), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE provider_id = pid AND NOT is_hidden)
  WHERE p.id = pid;
  RETURN NULL;
END; $$;
CREATE TRIGGER refresh_provider_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.refresh_provider_rating();

CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.portfolio_items(provider_id);
GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view portfolios of published providers" ON public.portfolio_items FOR SELECT TO anon, authenticated USING (private.provider_is_published(provider_id));
CREATE POLICY "Providers manage own portfolio" ON public.portfolio_items FOR ALL TO authenticated USING (private.owns_provider(provider_id)) WITH CHECK (private.owns_provider(provider_id));
CREATE POLICY "Admins manage portfolios" ON public.portfolio_items FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.saved_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_providers TO authenticated;
GRANT ALL ON public.saved_providers TO service_role;
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own saved providers" ON public.saved_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users save providers" ON public.saved_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave providers" ON public.saved_providers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION private.notify_request_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_user UUID;
BEGIN
  SELECT user_id INTO provider_user FROM public.provider_profiles WHERE id = NEW.provider_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (provider_user, 'request_new', 'New service request', NEW.title, '/provider-dashboard');
  ELSIF NEW.status <> OLD.status THEN
    IF auth.uid() = NEW.client_id THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (provider_user, 'request_' || NEW.status, 'Request ' || NEW.status, NEW.title, '/provider-dashboard');
    ELSE
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.client_id, 'request_' || NEW.status, 'Your request was ' || replace(NEW.status::text,'_',' '), NEW.title, '/dashboard');
    END IF;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER notify_request_change AFTER INSERT OR UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION private.notify_request_change();

-- Storage access rules (buckets already created)
CREATE POLICY "Anyone can read avatars and portfolio files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id IN ('avatars','portfolio'));
CREATE POLICY "Users upload to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('avatars','portfolio','request-attachments') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('avatars','portfolio','request-attachments') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('avatars','portfolio','request-attachments') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'request-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);