import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/marketplace";
import { getDashboardPath } from "@/lib/auth-roles";

export const Route = createFileRoute("/_authenticated/admin-dashboard")({
  beforeLoad: ({ context }) => {
    if (context.primaryRole !== "admin") throw redirect({ to: getDashboardPath(context.primaryRole) });
  },
  head: () => ({ meta: [{ title: "Admin Dashboard — SERVICONNECT" }, { name: "description", content: "Manage the SERVICONNECT marketplace foundation." }, { property: "og:title", content: "Admin Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage the SERVICONNECT marketplace foundation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <DashboardShell role="admin" />,
});
