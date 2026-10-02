DROP POLICY "Anyone reads platform settings" ON public.platform_settings;
REVOKE SELECT ON public.platform_settings FROM anon;
CREATE POLICY "Admins read platform settings" ON public.platform_settings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));