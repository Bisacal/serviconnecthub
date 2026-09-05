import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/marketplace";
import { getDashboardPath } from "@/lib/auth-roles";

export const Route = createFileRoute("/_authenticated/provider-dashboard")({
  beforeLoad: ({ context }) => {
    if (context.primaryRole !== "provider") throw redirect({ to: getDashboardPath(context.primaryRole) });
  },
  head: () => ({ meta: [{ title: "Provider Dashboard — SERVICONNECT" }, { name: "description", content: "Manage your SERVICONNECT professional profile." }, { property: "og:title", content: "Provider Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage your SERVICONNECT professional profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <DashboardShell role="provider" />,
});
