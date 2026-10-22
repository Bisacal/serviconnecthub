import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getPrimaryRole, getUserRoles } from "@/lib/auth-roles";

export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "login", role: "client" } });
    const roles = await getUserRoles(data.user.id);
    return { user: data.user, roles, primaryRole: getPrimaryRole(roles) };
  },
  component: () => <Outlet />,
});