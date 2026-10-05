DROP POLICY IF EXISTS "Admins manage provider subscriptions" ON public.provider_subscriptions;
CREATE POLICY "Admins manage provider subscriptions" ON public.provider_subscriptions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
REVOKE EXECUTE ON FUNCTION public.provider_current_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_current_plan(uuid) TO anon, authenticated;