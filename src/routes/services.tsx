import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/components/marketplace";

export const Route = createFileRoute("/services")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "Services — SERVICONNECT" }, { name: "description", content: "Browse trusted service categories on SERVICONNECT." }, { property: "og:title", content: "Services — SERVICONNECT" }, { property: "og:description", content: "Browse trusted service categories on SERVICONNECT." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ServicesPage,
});