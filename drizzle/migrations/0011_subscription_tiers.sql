ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_services integer,
  ADD COLUMN IF NOT EXISTS max_portfolio_items integer,
  ADD COLUMN IF NOT EXISTS visibility_rank smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured_placement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_slug_key ON public.subscription_plans(slug);
CREATE INDEX IF NOT EXISTS provider_subscriptions_provider_idx ON public.provider_subscriptions(provider_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_subscriptions TO authenticated;
DROP POLICY IF EXISTS "Admins manage provider subscriptions" ON public.provider_subscriptions;
CREATE POLICY "Admins manage provider subscriptions" ON public.provider_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Effective plan: newest active, unexpired subscription; otherwise the Free plan.
CREATE OR REPLACE FUNCTION public.provider_current_plan(_provider_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT s.plan_id FROM public.provider_subscriptions s
      WHERE s.provider_id = _provider_id AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY s.created_at DESC LIMIT 1),
    (SELECT id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1))
$$;
GRANT EXECUTE ON FUNCTION public.provider_current_plan(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_plan_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _limit integer; _count integer;
BEGIN
  IF TG_TABLE_NAME = 'provider_services' THEN
    SELECT max_services INTO _limit FROM public.subscription_plans WHERE id = public.provider_current_plan(NEW.provider_id);
    SELECT count(*) INTO _count FROM public.provider_services WHERE provider_id = NEW.provider_id;
    IF _limit IS NOT NULL AND _count >= _limit THEN
      RAISE EXCEPTION 'Your plan allows up to % service listings. Upgrade your plan to add more.', _limit;
    END IF;
  ELSE
    SELECT max_portfolio_items INTO _limit FROM public.subscription_plans WHERE id = public.provider_current_plan(NEW.provider_id);
    SELECT count(*) INTO _count FROM public.portfolio_items WHERE provider_id = NEW.provider_id;
    IF _limit IS NOT NULL AND _count >= _limit THEN
      RAISE EXCEPTION 'Your plan allows up to % portfolio items. Upgrade your plan to add more.', _limit;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_service_limit ON public.provider_services;
CREATE TRIGGER enforce_service_limit BEFORE INSERT ON public.provider_services FOR EACH ROW EXECUTE FUNCTION private.enforce_plan_limits();
DROP TRIGGER IF EXISTS enforce_portfolio_limit ON public.portfolio_items;
CREATE TRIGGER enforce_portfolio_limit BEFORE INSERT ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION private.enforce_plan_limits();

-- New providers start on the Free plan.
CREATE OR REPLACE FUNCTION private.assign_free_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _free uuid;
BEGIN
  SELECT id INTO _free FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  IF _free IS NOT NULL THEN
    INSERT INTO public.provider_subscriptions(provider_id, plan_id, status, current_period_start)
    VALUES (NEW.id, _free, 'active', now());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assign_free_plan ON public.provider_profiles;
CREATE TRIGGER assign_free_plan AFTER INSERT ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION private.assign_free_plan();

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();