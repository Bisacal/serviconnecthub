import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminDashboard, adminTabs, type AdminTab } from "@/components/admin-dashboard";
import { getDashboardPath } from "@/lib/auth-roles";

export const Route = createFileRoute("/_authenticated/admin-dashboard")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { tab?: AdminTab } => {
    const tab = search["tab"];
    return adminTabs.includes(tab as AdminTab) ? { tab: tab as AdminTab } : {};
  },
  // UI gate only — every admin read/write is independently enforced by database role checks.
  beforeLoad: ({ context }) => {
    if (context.primaryRole !== "admin") throw redirect({ to: getDashboardPath(context.primaryRole) });
  },
  head: () => ({ meta: [{ title: "Admin Dashboard — SERVICONNECT" }, { name: "description", content: "Manage SERVICONNECT users, providers, verification and categories." }, { property: "og:title", content: "Admin Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage SERVICONNECT users, providers, verification and categories." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AdminRoute,
});

function AdminRoute() {
  const { tab } = Route.useSearch();
  return <AdminDashboard tab={tab ?? "overview"} />;
}
