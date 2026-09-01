import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/marketplace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SERVICONNECT" }, { name: "description", content: "Your SERVICONNECT workspace." }, { property: "og:title", content: "Dashboard — SERVICONNECT" }, { property: "og:description", content: "Your SERVICONNECT workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <DashboardShell role="client" />,
});