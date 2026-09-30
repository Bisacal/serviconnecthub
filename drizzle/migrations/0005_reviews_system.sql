ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_note text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_name text;
CREATE INDEX IF NOT EXISTS reviews_provider_idx ON public.reviews(provider_id, created_at DESC);

DROP POLICY IF EXISTS "Providers view own reviews" ON public.reviews;
CREATE POLICY "Providers view own reviews" ON public.reviews FOR SELECT TO authenticated USING (private.owns_provider(provider_id));

CREATE OR REPLACE FUNCTION private.guard_review_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT private.has_role(auth.uid(),'admin') THEN
    NEW.is_hidden := OLD.is_hidden; NEW.moderation_note := OLD.moderation_note; NEW.request_id := OLD.request_id;
    NEW.provider_id := OLD.provider_id; NEW.client_id := OLD.client_id; NEW.created_at := OLD.created_at;
    NEW.reviewer_name := OLD.reviewer_name;
  END IF;
  IF length(coalesce(NEW.comment,'')) > 1500 THEN RAISE EXCEPTION 'Comment is too long'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION private.prepare_review_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(coalesce(NEW.comment,'')) > 1500 THEN RAISE EXCEPTION 'Comment is too long'; END IF;
  NEW.is_hidden := false; NEW.moderation_note := NULL;
  SELECT coalesce(nullif(split_part(coalesce(full_name, display_name, ''), ' ', 1), ''), 'Client') INTO NEW.reviewer_name
    FROM public.profiles WHERE user_id = NEW.client_id;
  NEW.reviewer_name := coalesce(NEW.reviewer_name, 'Client');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS prepare_review_insert ON public.reviews;
CREATE TRIGGER prepare_review_insert BEFORE INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.prepare_review_insert();

CREATE OR REPLACE FUNCTION private.notify_new_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  SELECT user_id, 'review_new', 'New ' || NEW.rating || '-star review', left(coalesce(NEW.comment,''), 140), '/provider-dashboard?tab=reviews'
  FROM public.provider_profiles WHERE id = NEW.provider_id;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS notify_new_review ON public.reviews;
CREATE TRIGGER notify_new_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.notify_new_review();