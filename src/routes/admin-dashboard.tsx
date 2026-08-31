import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/marketplace";

export const Route = createFileRoute("/admin-dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — SERVICONNECT" }, { name: "description", content: "Manage the SERVICONNECT marketplace foundation." }, { property: "og:title", content: "Admin Dashboard — SERVICONNECT" }, { property: "og:description", content: "Manage the SERVICONNECT marketplace foundation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <DashboardShell role="admin" />,
});