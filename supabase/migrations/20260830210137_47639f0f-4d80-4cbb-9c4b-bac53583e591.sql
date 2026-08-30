CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can choose a client or provider role" ON public.user_roles;
DROP POLICY IF EXISTS "Administrators can manage roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can choose a client or provider role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role IN ('client', 'provider'));
CREATE POLICY "Administrators can manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Administrators can manage provider profiles" ON public.provider_profiles;
CREATE POLICY "Administrators can manage provider profiles" ON public.provider_profiles FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Administrators can manage service categories" ON public.service_categories;
CREATE POLICY "Administrators can manage service categories" ON public.service_categories FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));