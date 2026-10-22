CREATE OR REPLACE FUNCTION private.account_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active');
$function$;
REVOKE EXECUTE ON FUNCTION private.account_is_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.account_is_active() TO authenticated;

DO $policies$
DECLARE _table text; _operation text;
BEGIN
  FOREACH _table IN ARRAY ARRAY['profiles','client_profiles','provider_profiles','provider_services','portfolio_items','provider_availability','saved_providers','service_requests','bookings','reviews','verification_documents','notifications','messages','conversations','user_roles','service_categories','service_subcategories','platform_settings','subscription_plans','provider_subscriptions','payments','refunds','featured_listings','payment_events'] LOOP
    FOREACH _operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = _table AND permissive = 'RESTRICTIVE' AND cmd = _operation AND (qual LIKE '%account_is_active%' OR with_check LIKE '%account_is_active%')) THEN
        IF _operation = 'INSERT' THEN
          EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.account_is_active())', 'Account status guard insert', _table);
        ELSIF _operation = 'UPDATE' THEN
          EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (private.account_is_active()) WITH CHECK (private.account_is_active())', 'Account status guard update', _table);
        ELSE
          EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (private.account_is_active())', 'Account status guard delete', _table);
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$policies$;

CREATE POLICY "Active accounts upload files" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (bucket_id NOT IN ('avatars','portfolio','request-attachments','verification-documents') OR private.account_is_active());
CREATE POLICY "Active accounts modify files" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id NOT IN ('avatars','portfolio','request-attachments','verification-documents') OR private.account_is_active())
WITH CHECK (bucket_id NOT IN ('avatars','portfolio','request-attachments','verification-documents') OR private.account_is_active());
CREATE POLICY "Active accounts delete files" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id NOT IN ('avatars','portfolio','request-attachments','verification-documents') OR private.account_is_active());

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT private.account_is_active() THEN
    RAISE EXCEPTION 'Your account is suspended or deactivated. Changes are not allowed.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.conversations SET
    client_last_read_at = CASE WHEN auth.uid() = client_id THEN now() ELSE client_last_read_at END,
    provider_last_read_at = CASE WHEN auth.uid() = provider_user_id THEN now() ELSE provider_last_read_at END
  WHERE id = _conversation_id AND auth.uid() IN (client_id, provider_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_conversation(_client_id uuid, _provider_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE prov_user uuid; conv uuid;
BEGIN
  IF NOT private.account_is_active() THEN
    RAISE EXCEPTION 'Your account is suspended or deactivated. Changes are not allowed.' USING ERRCODE = '42501';
  END IF;
  SELECT user_id INTO prov_user FROM public.provider_profiles WHERE id = _provider_id;
  IF prov_user IS NULL THEN RAISE EXCEPTION 'Provider not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() NOT IN (_client_id, prov_user) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _client_id = prov_user THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_requests WHERE client_id = _client_id AND provider_id = _provider_id)
     AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE client_id = _client_id AND provider_id = _provider_id) THEN
    RAISE EXCEPTION 'Messaging opens once you have a service request or booking with this provider';
  END IF;
  INSERT INTO public.conversations(client_id, provider_id, provider_user_id) VALUES (_client_id, _provider_id, prov_user)
    ON CONFLICT (client_id, provider_id) DO NOTHING;
  SELECT id INTO conv FROM public.conversations WHERE client_id = _client_id AND provider_id = _provider_id;
  RETURN conv;
END;
$function$;