import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClientDashboard, clientTabs, type ClientTab } from "@/components/client-dashboard";
import { getDashboardPath } from "@/lib/auth-roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: ClientTab } => {
    const tab = search.tab;
    return clientTabs.includes(tab as ClientTab) ? { tab: tab as ClientTab } : {};
  },
  beforeLoad: ({ context }) => {
    if (context.primaryRole !== "client") throw redirect({ to: getDashboardPath(context.primaryRole) });
  },
  head: () => ({ meta: [{ title: "Client Dashboard — SERVICONNECT" }, { name: "description", content: "Manage saved providers, requests and your profile." }, { property: "og:title", content: "Client Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage saved providers, requests and your profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { tab } = Route.useSearch();
  return <ClientDashboard tab={tab ?? "overview"} />;
}
