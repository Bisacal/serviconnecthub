import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProviderDashboard, providerTabs, type ProviderTab } from "@/components/provider-dashboard";
import { getDashboardPath } from "@/lib/auth-roles";

export const Route = createFileRoute("/_authenticated/provider-dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: ProviderTab } => {
    const tab = search["tab"];
    return providerTabs.includes(tab as ProviderTab) ? { tab: tab as ProviderTab } : {};
  },
  beforeLoad: ({ context }) => {
    if (context.primaryRole !== "provider") throw redirect({ to: getDashboardPath(context.primaryRole) });
  },
  head: () => ({ meta: [{ title: "Provider Dashboard — SERVICONNECT" }, { name: "description", content: "Manage your SERVICONNECT professional profile, services and portfolio." }, { property: "og:title", content: "Provider Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage your SERVICONNECT professional profile, services and portfolio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ProviderDashboardRoute,
});

function ProviderDashboardRoute() {
  const { tab } = Route.useSearch();
  return <ProviderDashboard tab={tab ?? "overview"} />;
}
