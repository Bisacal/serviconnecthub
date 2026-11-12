-- Stage 2: audited, admin-only subscription operation. Additive only.
CREATE ROLE subscription_admin_operator NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOINHERIT;
GRANT subscription_admin_operator TO postgres WITH SET TRUE, INHERIT FALSE;
GRANT USAGE ON SCHEMA public TO subscription_admin_operator;

CREATE TABLE public.subscription_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  subscription_id uuid,
  operation text NOT NULL CHECK (operation IN ('create','change_plan','extend','suspend','reactivate')),
  previous_values jsonb,
  new_values jsonb,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000 AND reason = btrim(reason)),
  request_id uuid NOT NULL UNIQUE,
  request_fingerprint text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscription_admin_audit_provider_idx ON public.subscription_admin_audit(provider_id, created_at DESC);
REVOKE ALL ON public.subscription_admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscription_admin_audit TO authenticated;
GRANT ALL ON public.subscription_admin_audit TO service_role;
GRANT SELECT, INSERT ON public.subscription_admin_audit TO subscription_admin_operator;
ALTER TABLE public.subscription_admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active admins read subscription audit" ON public.subscription_admin_audit FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) AND private.account_is_active());
CREATE POLICY "Operator reads audit" ON public.subscription_admin_audit FOR SELECT TO subscription_admin_operator USING (true);
CREATE POLICY "Operator appends audit" ON public.subscription_admin_audit FOR INSERT TO subscription_admin_operator WITH CHECK (true);

CREATE FUNCTION private.subscription_audit_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Subscription audit entries cannot be changed or removed' USING ERRCODE = '42501';
END $$;
REVOKE ALL ON FUNCTION private.subscription_audit_append_only() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER subscription_audit_append_only BEFORE UPDATE OR DELETE ON public.subscription_admin_audit
  FOR EACH ROW EXECUTE FUNCTION private.subscription_audit_append_only();

-- Narrow reads/writes for the operator role only (no DELETE anywhere).
GRANT SELECT (user_id, role) ON public.user_roles TO subscription_admin_operator;
CREATE POLICY "Subscription operator reads roles" ON public.user_roles FOR SELECT TO subscription_admin_operator USING (true);
GRANT SELECT (user_id, status) ON public.profiles TO subscription_admin_operator;
CREATE POLICY "Subscription operator reads status" ON public.profiles FOR SELECT TO subscription_admin_operator USING (true);
GRANT SELECT (id) ON public.provider_profiles TO subscription_admin_operator;
CREATE POLICY "Subscription operator reads provider ids" ON public.provider_profiles FOR SELECT TO subscription_admin_operator USING (true);
GRANT SELECT (id) ON public.subscription_plans TO subscription_admin_operator;
CREATE POLICY "Subscription operator reads plan ids" ON public.subscription_plans FOR SELECT TO subscription_admin_operator USING (true);
GRANT SELECT, INSERT ON public.provider_subscriptions TO subscription_admin_operator;
GRANT UPDATE (plan_id, status, current_period_end) ON public.provider_subscriptions TO subscription_admin_operator;
CREATE POLICY "Subscription operator reads" ON public.provider_subscriptions FOR SELECT TO subscription_admin_operator USING (true);
CREATE POLICY "Subscription operator inserts" ON public.provider_subscriptions FOR INSERT TO subscription_admin_operator WITH CHECK (true);
CREATE POLICY "Subscription operator updates" ON public.provider_subscriptions FOR UPDATE TO subscription_admin_operator USING (true) WITH CHECK (true);

CREATE FUNCTION public.admin_subscription_operation(
  _request_id uuid, _operation text, _provider_id uuid, _reason text,
  _subscription_id uuid DEFAULT NULL, _expected_updated_at timestamptz DEFAULT NULL,
  _plan_id uuid DEFAULT NULL, _period_end timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _uid uuid := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
  _reason_clean text := btrim(coalesce(_reason, ''));
  _fp text; _prior public.subscription_admin_audit%ROWTYPE;
  _effective uuid[]; _row public.provider_subscriptions%ROWTYPE; _new public.provider_subscriptions%ROWTYPE;
  _result jsonb; _audit_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign-in required' USING ERRCODE = 'PT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin')
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND status = 'active') THEN
    RAISE EXCEPTION 'Only active administrators can manage subscriptions' USING ERRCODE = 'PT403';
  END IF;
  IF _request_id IS NULL OR _provider_id IS NULL THEN RAISE EXCEPTION 'Request ID and provider are required' USING ERRCODE = '22023'; END IF;
  IF _operation IS NULL OR _operation NOT IN ('create','change_plan','extend','suspend','reactivate') THEN
    RAISE EXCEPTION 'Unknown operation' USING ERRCODE = '22023'; END IF;
  IF char_length(_reason_clean) < 10 THEN RAISE EXCEPTION 'A reason of at least 10 characters is required' USING ERRCODE = '22023'; END IF;
  IF char_length(_reason_clean) > 1000 THEN RAISE EXCEPTION 'Reason must be 1000 characters or fewer' USING ERRCODE = '22023'; END IF;
  _fp := md5(concat_ws('|', _uid, _operation, _provider_id, _reason_clean, _subscription_id, _expected_updated_at, _plan_id, _period_end));

  PERFORM pg_advisory_xact_lock(hashtextextended('sub-req:' || _request_id::text, 0));
  SELECT * INTO _prior FROM public.subscription_admin_audit WHERE request_id = _request_id;
  IF FOUND THEN
    IF _prior.admin_user_id <> _uid OR _prior.request_fingerprint <> _fp THEN
      RAISE EXCEPTION 'This request ID was already used for a different request' USING ERRCODE = 'PT422';
    END IF;
    RETURN _prior.result || jsonb_build_object('replayed', true);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('sub-provider:' || _provider_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = _provider_id) THEN
    RAISE EXCEPTION 'Provider not found' USING ERRCODE = 'PT404'; END IF;
  SELECT coalesce(array_agg(id ORDER BY created_at DESC), '{}') INTO _effective FROM public.provider_subscriptions
    WHERE provider_id = _provider_id AND status = 'active' AND (current_period_end IS NULL OR current_period_end > now());
  IF cardinality(_effective) > 1 THEN
    RAISE EXCEPTION 'This provider has % active subscriptions; resolve the duplicates before making changes', cardinality(_effective)
      USING ERRCODE = 'PT422', DETAIL = 'multiple_active';
  END IF;
  IF _plan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = _plan_id) THEN
    RAISE EXCEPTION 'Plan not found' USING ERRCODE = 'PT404'; END IF;
  IF _period_end IS NOT NULL AND _period_end <= now() THEN
    RAISE EXCEPTION 'End date must be in the future' USING ERRCODE = '22023'; END IF;

  IF _operation = 'create' THEN
    IF _plan_id IS NULL THEN RAISE EXCEPTION 'Plan is required' USING ERRCODE = '22023'; END IF;
    IF cardinality(_effective) > 0 THEN
      RAISE EXCEPTION 'Provider already has an effective subscription; change it instead' USING ERRCODE = 'PT422', DETAIL = 'effective_exists';
    END IF;
    INSERT INTO public.provider_subscriptions(provider_id, plan_id, status, current_period_start, current_period_end)
      VALUES (_provider_id, _plan_id, 'active', now(), _period_end) RETURNING * INTO _new;
  ELSE
    IF _subscription_id IS NULL OR _expected_updated_at IS NULL THEN
      RAISE EXCEPTION 'Subscription and its last-updated time are required' USING ERRCODE = '22023'; END IF;
    SELECT * INTO _row FROM public.provider_subscriptions WHERE id = _subscription_id AND provider_id = _provider_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found for this provider' USING ERRCODE = 'PT404'; END IF;
    IF _row.updated_at <> _expected_updated_at THEN
      RAISE EXCEPTION 'This subscription was changed by someone else; reload and try again' USING ERRCODE = 'PT409', DETAIL = 'conflict';
    END IF;
    IF _operation = 'reactivate' THEN
      IF _row.status <> 'suspended' THEN RAISE EXCEPTION 'Only a suspended subscription can be reactivated' USING ERRCODE = 'PT422'; END IF;
      IF cardinality(_effective) > 0 THEN RAISE EXCEPTION 'Provider already has an effective subscription' USING ERRCODE = 'PT422', DETAIL = 'effective_exists'; END IF;
      IF EXISTS (SELECT 1 FROM public.provider_subscriptions WHERE provider_id = _provider_id AND created_at > _row.created_at) THEN
        RAISE EXCEPTION 'Only the most recent subscription can be reactivated' USING ERRCODE = 'PT422'; END IF;
      IF _period_end IS NULL AND _row.current_period_end IS NOT NULL AND _row.current_period_end <= now() THEN
        RAISE EXCEPTION 'Period has ended; provide a new end date' USING ERRCODE = '22023'; END IF;
      UPDATE public.provider_subscriptions SET status = 'active', current_period_end = coalesce(_period_end, current_period_end)
        WHERE id = _row.id RETURNING * INTO _new;
    ELSE
      IF NOT (_row.id = ANY(_effective)) THEN
        RAISE EXCEPTION 'Only the currently effective subscription can be changed' USING ERRCODE = 'PT422', DETAIL = 'not_effective'; END IF;
      IF _operation = 'change_plan' THEN
        IF _plan_id IS NULL OR _plan_id = _row.plan_id THEN RAISE EXCEPTION 'Choose a different plan' USING ERRCODE = '22023'; END IF;
        UPDATE public.provider_subscriptions SET plan_id = _plan_id WHERE id = _row.id RETURNING * INTO _new;
      ELSIF _operation = 'extend' THEN
        IF _period_end IS NULL THEN RAISE EXCEPTION 'New end date is required' USING ERRCODE = '22023'; END IF;
        IF _row.current_period_end IS NULL THEN RAISE EXCEPTION 'This subscription has no end date to extend' USING ERRCODE = 'PT422'; END IF;
        IF _period_end <= _row.current_period_end THEN RAISE EXCEPTION 'New end date must be later than the current one' USING ERRCODE = '22023'; END IF;
        UPDATE public.provider_subscriptions SET current_period_end = _period_end WHERE id = _row.id RETURNING * INTO _new;
      ELSE
        UPDATE public.provider_subscriptions SET status = 'suspended' WHERE id = _row.id RETURNING * INTO _new;
      END IF;
    END IF;
  END IF;

  _audit_id := gen_random_uuid();
  _result := jsonb_build_object('ok', true, 'replayed', false, 'operation', _operation, 'audit_id', _audit_id,
    'subscription', to_jsonb(_new));
  INSERT INTO public.subscription_admin_audit(id, admin_user_id, provider_id, subscription_id, operation,
      previous_values, new_values, reason, request_id, request_fingerprint, result)
    VALUES (_audit_id, _uid, _provider_id, _new.id, _operation,
      CASE WHEN _row.id IS NULL THEN NULL ELSE to_jsonb(_row) END, to_jsonb(_new), _reason_clean, _request_id, _fp, _result);
  RETURN _result;
END $fn$;

REVOKE ALL ON FUNCTION public.admin_subscription_operation(uuid, text, uuid, text, uuid, timestamptz, uuid, timestamptz) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_subscription_operation(uuid, text, uuid, text, uuid, timestamptz, uuid, timestamptz) TO authenticated;
GRANT CREATE ON SCHEMA public TO subscription_admin_operator;
ALTER FUNCTION public.admin_subscription_operation(uuid, text, uuid, text, uuid, timestamptz, uuid, timestamptz) OWNER TO subscription_admin_operator;
REVOKE CREATE ON SCHEMA public FROM subscription_admin_operator;