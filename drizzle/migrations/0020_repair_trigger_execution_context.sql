CREATE OR REPLACE FUNCTION private.guard_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public, private
AS $function$
DECLARE
  is_client BOOLEAN := auth.uid() = OLD.client_id;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.client_id := OLD.client_id;
  NEW.provider_id := OLD.provider_id;
  NEW.created_at := OLD.created_at;

  IF OLD.status IN ('declined', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'This request is closed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF is_client THEN
      IF NEW.status <> 'cancelled'
         OR OLD.status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Clients can only cancel pending or accepted requests';
      END IF;
    ELSE
      IF NOT (
        (OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined'))
        OR (OLD.status = 'accepted' AND NEW.status = 'in_progress')
        OR (OLD.status = 'in_progress' AND NEW.status = 'completed')
      ) THEN
        RAISE EXCEPTION 'Invalid status change';
      END IF;
    END IF;
  END IF;

  IF NOT is_client OR OLD.status <> 'pending' THEN
    NEW.title := OLD.title;
    NEW.details := OLD.details;
    NEW.location := OLD.location;
    NEW.preferred_date := OLD.preferred_date;
    NEW.preferred_time := OLD.preferred_time;
    NEW.budget := OLD.budget;
    NEW.service_id := OLD.service_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.protect_provider_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public, private
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_verified := false;
      NEW.rating_average := 0;
      NEW.review_count := 0;
    ELSE
      NEW.is_verified := OLD.is_verified;
      NEW.rating_average := OLD.rating_average;
      NEW.review_count := OLD.review_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
