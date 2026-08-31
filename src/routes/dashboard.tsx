import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/marketplace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Dashboard — SERVICONNECT" }, { name: "description", content: "Your SERVICONNECT workspace." }, { property: "og:title", content: "Dashboard — SERVICONNECT" }, { property: "og:description", content: "Your SERVICONNECT workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <DashboardShell role="client" />,
});