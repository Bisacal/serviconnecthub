-- Fixed-window rate limit counters, private schema only (never exposed via Data API)
CREATE TABLE private.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Returns void when under the limit; raises a user-friendly error when exceeded.
-- SECURITY DEFINER so triggers can use it without granting table access to users.
CREATE OR REPLACE FUNCTION private.check_rate_limit(_action text, _limit int, _window_seconds int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
  _key text := _action || ':' || coalesce(auth.uid()::text, 'anon');
  _window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  _count int;
BEGIN
  INSERT INTO private.rate_limits (key, window_start, count)
  VALUES (_key, _window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = private.rate_limits.count + 1
  RETURNING count INTO _count;

  -- Opportunistic cleanup of old windows
  DELETE FROM private.rate_limits WHERE window_start < now() - interval '1 day';

  IF _count > _limit THEN
    RAISE EXCEPTION 'You''re doing that too often. Please wait a moment and try again.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.check_rate_limit(text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.check_rate_limit(text, int, int) FROM anon, authenticated;

-- Trigger helpers
CREATE OR REPLACE FUNCTION private.rate_limit_service_requests() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('service_request', 10, 3600); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_bookings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('booking', 10, 3600); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_messages() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('message', 30, 60); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_reviews() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('review', 5, 86400); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_verification_docs() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('verification_doc', 10, 86400); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_saved_providers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('saved_provider', 30, 3600); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_provider_services() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('provider_service', 20, 3600); RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION private.rate_limit_portfolio_items() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private AS $$
BEGIN PERFORM private.check_rate_limit('portfolio_item', 20, 3600); RETURN NEW; END;
$$;

CREATE TRIGGER rate_limit_service_requests BEFORE INSERT ON public.service_requests FOR EACH ROW EXECUTE FUNCTION private.rate_limit_service_requests();
CREATE TRIGGER rate_limit_bookings BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.rate_limit_bookings();
CREATE TRIGGER rate_limit_messages BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION private.rate_limit_messages();
CREATE TRIGGER rate_limit_reviews BEFORE INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.rate_limit_reviews();
CREATE TRIGGER rate_limit_verification_docs BEFORE INSERT ON public.verification_documents FOR EACH ROW EXECUTE FUNCTION private.rate_limit_verification_docs();
CREATE TRIGGER rate_limit_saved_providers BEFORE INSERT ON public.saved_providers FOR EACH ROW EXECUTE FUNCTION private.rate_limit_saved_providers();
CREATE TRIGGER rate_limit_provider_services BEFORE INSERT ON public.provider_services FOR EACH ROW EXECUTE FUNCTION private.rate_limit_provider_services();
CREATE TRIGGER rate_limit_portfolio_items BEFORE INSERT ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION private.rate_limit_portfolio_items();