CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','declined','cancelled','completed');

ALTER TABLE public.provider_services
  ADD COLUMN requires_booking boolean NOT NULL DEFAULT false,
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 1440);

CREATE TABLE public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX provider_availability_provider_idx ON public.provider_availability(provider_id, weekday);
GRANT SELECT ON public.provider_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_availability TO authenticated;
GRANT ALL ON public.provider_availability TO service_role;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view availability of published providers" ON public.provider_availability FOR SELECT TO anon, authenticated USING (private.provider_is_published(provider_id));
CREATE POLICY "Providers manage own availability" ON public.provider_availability FOR ALL TO authenticated USING (private.owns_provider(provider_id)) WITH CHECK (private.owns_provider(provider_id));

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text CHECK (length(location) <= 200),
  notes text CHECK (length(notes) <= 1000),
  provider_note text CHECK (length(provider_note) <= 1000),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX bookings_provider_date_idx ON public.bookings(provider_id, booking_date);
CREATE INDEX bookings_client_idx ON public.bookings(client_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Providers view their bookings" ON public.bookings FOR SELECT TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Admins view bookings" ON public.bookings FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Clients create bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id AND status = 'pending' AND private.provider_is_published(provider_id) AND NOT private.owns_provider(provider_id));
CREATE POLICY "Clients update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Providers update their bookings" ON public.bookings FOR UPDATE TO authenticated USING (private.owns_provider(provider_id)) WITH CHECK (private.owns_provider(provider_id));

-- Conflict + availability checks
CREATE OR REPLACE FUNCTION private.check_booking_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','confirmed') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_date < current_date THEN RAISE EXCEPTION 'Booking date cannot be in the past'; END IF;
    IF NEW.service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM provider_services WHERE id = NEW.service_id AND provider_id = NEW.provider_id AND is_active) THEN
      RAISE EXCEPTION 'Selected service does not belong to this provider';
    END IF;
    IF EXISTS (SELECT 1 FROM provider_availability WHERE provider_id = NEW.provider_id)
       AND NOT EXISTS (SELECT 1 FROM provider_availability a WHERE a.provider_id = NEW.provider_id
         AND a.weekday = extract(dow FROM NEW.booking_date)::int AND a.start_time <= NEW.start_time AND a.end_time >= NEW.end_time) THEN
      RAISE EXCEPTION 'The provider is not available at that time';
    END IF;
    IF EXISTS (SELECT 1 FROM bookings b WHERE b.client_id = NEW.client_id AND b.provider_id = NEW.provider_id AND b.booking_date = NEW.booking_date
         AND b.status IN ('pending','confirmed') AND b.start_time < NEW.end_time AND b.end_time > NEW.start_time) THEN
      RAISE EXCEPTION 'You already have a booking with this provider at that time';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM bookings b WHERE b.provider_id = NEW.provider_id AND b.booking_date = NEW.booking_date AND b.id <> NEW.id
       AND b.status = 'confirmed' AND b.start_time < NEW.end_time AND b.end_time > NEW.start_time) THEN
    RAISE EXCEPTION 'That time slot is already booked';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.guard_booking_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_client boolean := auth.uid() = OLD.client_id;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.client_id := OLD.client_id; NEW.provider_id := OLD.provider_id; NEW.created_at := OLD.created_at;
  NEW.service_id := OLD.service_id; NEW.booking_date := OLD.booking_date; NEW.start_time := OLD.start_time; NEW.end_time := OLD.end_time;
  IF OLD.status IN ('declined','cancelled','completed') THEN RAISE EXCEPTION 'This booking is closed'; END IF;
  IF is_client THEN
    NEW.provider_note := OLD.provider_note;
    IF NEW.status <> OLD.status AND NEW.status <> 'cancelled' THEN RAISE EXCEPTION 'Clients can only cancel bookings'; END IF;
  ELSE
    NEW.notes := OLD.notes; NEW.location := OLD.location; NEW.details := OLD.details;
    IF NEW.status <> OLD.status AND NOT ((OLD.status = 'pending' AND NEW.status IN ('confirmed','declined'))
       OR (OLD.status = 'confirmed' AND NEW.status IN ('completed','cancelled'))) THEN
      RAISE EXCEPTION 'Invalid booking status change';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.notify_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prov_user uuid;
BEGIN
  SELECT user_id INTO prov_user FROM provider_profiles WHERE id = NEW.provider_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications(user_id,type,title,body,link) VALUES (prov_user,'booking_new','New booking request',
      'Requested for ' || to_char(NEW.booking_date,'DD Mon YYYY') || ' at ' || to_char(NEW.start_time,'HH24:MI'), '/provider-dashboard?tab=bookings');
  ELSIF NEW.status <> OLD.status THEN
    IF NEW.status = 'cancelled' AND auth.uid() = NEW.client_id THEN
      INSERT INTO notifications(user_id,type,title,body,link) VALUES (prov_user,'booking_cancelled','Booking cancelled by client',
        to_char(NEW.booking_date,'DD Mon YYYY') || ' at ' || to_char(NEW.start_time,'HH24:MI'), '/provider-dashboard?tab=bookings');
    ELSE
      INSERT INTO notifications(user_id,type,title,body,link) VALUES (NEW.client_id,'booking_' || NEW.status::text,'Booking ' || NEW.status::text,
        to_char(NEW.booking_date,'DD Mon YYYY') || ' at ' || to_char(NEW.start_time,'HH24:MI'), '/dashboard?tab=bookings');
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER guard_booking_update BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.guard_booking_update();
CREATE TRIGGER check_booking_slot BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.check_booking_slot();
CREATE TRIGGER notify_booking_change AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.notify_booking_change();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Busy times only (no client details) so clients can avoid taken slots
CREATE OR REPLACE FUNCTION public.get_provider_busy_slots(_provider_id uuid, _date date)
RETURNS TABLE(start_time time, end_time time) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.start_time, b.end_time FROM bookings b
  WHERE b.provider_id = _provider_id AND b.booking_date = _date AND b.status = 'confirmed'
    AND private.provider_is_published(_provider_id)
$$;
REVOKE ALL ON FUNCTION public.get_provider_busy_slots(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_provider_busy_slots(uuid, date) TO anon, authenticated;