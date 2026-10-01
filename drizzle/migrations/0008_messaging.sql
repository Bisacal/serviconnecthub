CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL,
  client_last_read_at timestamptz NOT NULL DEFAULT now(),
  provider_last_read_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider_id)
);
CREATE INDEX conversations_provider_user_idx ON public.conversations(provider_user_id);
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view conversations" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = provider_user_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','document')),
  body text CHECK (length(body) <= 4000),
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_conversation_participant(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM conversations c WHERE c.id = _conversation_id AND auth.uid() IN (c.client_id, c.provider_user_id))
$$;
REVOKE ALL ON FUNCTION private.is_conversation_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_conversation_participant(uuid) TO authenticated;

CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (private.is_conversation_participant(conversation_id));
-- Text only for now; image/document kinds are reserved for a later phase.
CREATE POLICY "Participants send text messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND kind = 'text' AND attachment_path IS NULL
    AND length(trim(coalesce(body,''))) > 0 AND private.is_conversation_participant(conversation_id));

CREATE OR REPLACE FUNCTION private.touch_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at,
    client_last_read_at = CASE WHEN NEW.sender_id = client_id THEN NEW.created_at ELSE client_last_read_at END,
    provider_last_read_at = CASE WHEN NEW.sender_id = provider_user_id THEN NEW.created_at ELSE provider_last_read_at END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER touch_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION private.touch_conversation();

-- Opens (or returns) a conversation only when a real relationship exists.
CREATE OR REPLACE FUNCTION public.start_conversation(_client_id uuid, _provider_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prov_user uuid; conv uuid;
BEGIN
  SELECT user_id INTO prov_user FROM provider_profiles WHERE id = _provider_id;
  IF prov_user IS NULL THEN RAISE EXCEPTION 'Provider not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() NOT IN (_client_id, prov_user) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _client_id = prov_user THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM service_requests WHERE client_id = _client_id AND provider_id = _provider_id)
     AND NOT EXISTS (SELECT 1 FROM bookings WHERE client_id = _client_id AND provider_id = _provider_id) THEN
    RAISE EXCEPTION 'Messaging opens once you have a service request or booking with this provider';
  END IF;
  INSERT INTO conversations(client_id, provider_id, provider_user_id) VALUES (_client_id, _provider_id, prov_user)
    ON CONFLICT (client_id, provider_id) DO NOTHING;
  SELECT id INTO conv FROM conversations WHERE client_id = _client_id AND provider_id = _provider_id;
  RETURN conv;
END $$;
REVOKE ALL ON FUNCTION public.start_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET
    client_last_read_at = CASE WHEN auth.uid() = client_id THEN now() ELSE client_last_read_at END,
    provider_last_read_at = CASE WHEN auth.uid() = provider_user_id THEN now() ELSE provider_last_read_at END
  WHERE id = _conversation_id AND auth.uid() IN (client_id, provider_user_id)
$$;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- Caller's conversations with the other party's display name and unread count.
CREATE OR REPLACE FUNCTION public.my_conversations()
RETURNS TABLE(id uuid, other_name text, is_client boolean, last_message_at timestamptz, last_body text, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id,
    CASE WHEN auth.uid() = c.client_id
      THEN coalesce(pp.public_name, pp.business_name, 'Service provider')
      ELSE coalesce(nullif(split_part(coalesce(pr.full_name, pr.display_name, ''), ' ', 1), ''), 'Client') END,
    auth.uid() = c.client_id,
    c.last_message_at,
    (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT count(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> auth.uid()
       AND m.created_at > CASE WHEN auth.uid() = c.client_id THEN c.client_last_read_at ELSE c.provider_last_read_at END)
  FROM conversations c
  JOIN provider_profiles pp ON pp.id = c.provider_id
  LEFT JOIN profiles pr ON pr.user_id = c.client_id
  WHERE auth.uid() IN (c.client_id, c.provider_user_id)
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_conversations() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;