import { createFileRoute } from "@tanstack/react-router";
import { DirectoryPage } from "@/components/marketplace";

type DirectorySearch = { service?: string; location?: string };

export const Route = createFileRoute("/directory")({
  validateSearch: (search: Record<string, unknown>) => ({ service: typeof search['service'] === "string" ? search['service'] : undefined, location: typeof search['location'] === "string" ? search['location'] : undefined } as DirectorySearch),
  head: () => ({ meta: [{ title: "Provider Directory — SERVICONNECT" }, { name: "description", content: "Browse and filter trusted Abuja professionals by category, location, price, rating, experience and availability." }, { property: "og:title", content: "Provider Directory — SERVICONNECT" }, { property: "og:description", content: "Browse and filter trusted Abuja professionals by category, location, price, rating, experience and availability." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const search = Route.useSearch();
    return <DirectoryPage service={search.service} location={search.location} />;
  },
});
