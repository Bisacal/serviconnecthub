CREATE TYPE public.payment_status AS ENUM ('pending','successful','failed','refunded');
CREATE TYPE public.payment_purpose AS ENUM ('service','subscription','featured_listing');
CREATE TYPE public.subscription_status AS ENUM ('pending','active','past_due','cancelled','expired');

-- Commission settings (single editable row per key)
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads platform settings" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
INSERT INTO public.platform_settings(key, value) VALUES ('commission', '{"percent": 10}'::jsonb) ON CONFLICT DO NOTHING;

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_plan_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active plans" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- Payments: written only by trusted server code (service role). No card data is ever stored.
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose public.payment_purpose NOT NULL,
  client_id uuid,                -- payer for service payments
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE SET NULL,
  service_request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  platform_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  provider_amount numeric(12,2) GENERATED ALWAYS AS (amount - platform_fee) STORED,
  currency text NOT NULL DEFAULT 'NGN',
  payment_provider text NOT NULL,          -- e.g. paystack, flutterwave, stripe
  transaction_reference text NOT NULL UNIQUE,
  provider_transaction_id text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'test' CHECK (environment IN ('test','live')),
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (platform_fee <= amount)
);
CREATE INDEX payments_client_idx ON public.payments(client_id, created_at DESC);
CREATE INDEX payments_provider_idx ON public.payments(provider_id, created_at DESC);
CREATE INDEX payments_status_idx ON public.payments(status);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Providers view their payments" ON public.payments FOR SELECT TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Admins view payments" ON public.payments FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reason text CHECK (length(reason) <= 1000),
  status public.payment_status NOT NULL DEFAULT 'pending',
  provider_refund_ref text UNIQUE,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refunds_payment_idx ON public.refunds(payment_id);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment parties view refunds" ON public.refunds FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND (p.client_id = auth.uid() OR private.owns_provider(p.provider_id)))
  OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.provider_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'pending',
  payment_provider text,
  provider_subscription_ref text UNIQUE,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_subscriptions_provider_idx ON public.provider_subscriptions(provider_id);
GRANT SELECT ON public.provider_subscriptions TO authenticated;
GRANT ALL ON public.provider_subscriptions TO service_role;
ALTER TABLE public.provider_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers view own subscriptions" ON public.provider_subscriptions FOR SELECT TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Admins view subscriptions" ON public.provider_subscriptions FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER update_provider_subscriptions_updated_at BEFORE UPDATE ON public.provider_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.featured_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX featured_listings_active_idx ON public.featured_listings(is_active, ends_at);
GRANT SELECT ON public.featured_listings TO anon, authenticated;
GRANT ALL ON public.featured_listings TO service_role;
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sees live featured listings" ON public.featured_listings FOR SELECT TO anon, authenticated
  USING (is_active AND now() BETWEEN starts_at AND ends_at AND private.provider_is_published(provider_id));
CREATE POLICY "Providers view own featured listings" ON public.featured_listings FOR SELECT TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Admins view featured listings" ON public.featured_listings FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));

-- Raw webhook log for audit + idempotency (server-only, no user access)
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  transaction_reference text,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_provider, event_id)
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view payment events" ON public.payment_events FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
GRANT SELECT ON public.payment_events TO authenticated;