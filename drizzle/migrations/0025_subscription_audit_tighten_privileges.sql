REVOKE ALL ON public.subscription_admin_audit FROM service_role;
REVOKE ALL ON public.subscription_admin_audit FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.subscription_admin_audit FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.subscription_admin_audit FROM subscription_admin_operator;
GRANT SELECT ON public.subscription_admin_audit TO authenticated;
GRANT SELECT, INSERT ON public.subscription_admin_audit TO subscription_admin_operator;
CREATE TRIGGER subscription_audit_no_truncate BEFORE TRUNCATE ON public.subscription_admin_audit
  FOR EACH STATEMENT EXECUTE FUNCTION private.subscription_audit_append_only();