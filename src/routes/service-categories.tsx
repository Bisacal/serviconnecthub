import { createFileRoute } from "@tanstack/react-router";
import { ServiceCategoriesPage } from "@/components/marketplace";

export const Route = createFileRoute("/service-categories")({
  head: () => ({
    meta: [
      { title: "Service Categories — SERVICONNECT" },
      { name: "description", content: "Explore service categories and find trusted professionals across Abuja." },
      { property: "og:title", content: "Service Categories — SERVICONNECT" },
      { property: "og:description", content: "Explore service categories and find trusted professionals across Abuja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServiceCategoriesPage,
});