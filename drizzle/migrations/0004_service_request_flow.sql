ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS preferred_time text;
CREATE INDEX IF NOT EXISTS service_requests_client_idx ON public.service_requests(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_provider_idx ON public.service_requests(provider_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.guard_request_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE is_client BOOLEAN := auth.uid() = OLD.client_id;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  NEW.client_id := OLD.client_id; NEW.provider_id := OLD.provider_id; NEW.created_at := OLD.created_at;
  IF OLD.status IN ('declined','completed','cancelled') THEN RAISE EXCEPTION 'This request is closed'; END IF;
  IF NEW.status <> OLD.status THEN
    IF is_client THEN
      IF NEW.status <> 'cancelled' OR OLD.status NOT IN ('pending','accepted') THEN
        RAISE EXCEPTION 'Clients can only cancel pending or accepted requests';
      END IF;
    ELSE
      IF NOT ((OLD.status = 'pending' AND NEW.status IN ('accepted','declined'))
           OR (OLD.status = 'accepted' AND NEW.status = 'in_progress')
           OR (OLD.status = 'in_progress' AND NEW.status = 'completed')) THEN
        RAISE EXCEPTION 'Invalid status change';
      END IF;
    END IF;
  END IF;
  IF NOT is_client THEN
    NEW.title := OLD.title; NEW.details := OLD.details; NEW.location := OLD.location;
    NEW.preferred_date := OLD.preferred_date; NEW.preferred_time := OLD.preferred_time;
    NEW.budget := OLD.budget; NEW.service_id := OLD.service_id;
  ELSIF OLD.status <> 'pending' THEN
    NEW.title := OLD.title; NEW.details := OLD.details; NEW.location := OLD.location;
    NEW.preferred_date := OLD.preferred_date; NEW.preferred_time := OLD.preferred_time;
    NEW.budget := OLD.budget; NEW.service_id := OLD.service_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_request_insert() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.provider_services WHERE id = NEW.service_id AND provider_id = NEW.provider_id AND is_active) THEN
    RAISE EXCEPTION 'Selected service does not belong to this provider';
  END IF;
  IF NEW.preferred_date IS NOT NULL AND NEW.preferred_date < current_date THEN
    RAISE EXCEPTION 'Preferred date cannot be in the past';
  END IF;
  IF length(NEW.title) > 150 OR length(coalesce(NEW.details,'')) > 2000 OR length(coalesce(NEW.location,'')) > 200 OR length(coalesce(NEW.preferred_time,'')) > 50 THEN
    RAISE EXCEPTION 'Request fields are too long';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS validate_request_insert ON public.service_requests;
CREATE TRIGGER validate_request_insert BEFORE INSERT ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.validate_request_insert();