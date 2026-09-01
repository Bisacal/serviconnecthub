import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/marketplace";

export const Route = createFileRoute("/_authenticated/provider-dashboard")({
  head: () => ({ meta: [{ title: "Provider Dashboard — SERVICONNECT" }, { name: "description", content: "Manage your SERVICONNECT professional profile." }, { property: "og:title", content: "Provider Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage your SERVICONNECT professional profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <DashboardShell role="provider" />,
});
