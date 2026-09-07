import { createFileRoute } from "@tanstack/react-router";
import { SearchResultsPage } from "@/components/marketplace";

type SearchResultsSearch = { service?: string | undefined; location?: string | undefined };

export const Route = createFileRoute("/search-results")({
  validateSearch: (search: Record<string, unknown>) => ({
    service: typeof search["service"] === "string" ? search["service"] : undefined,
    location: typeof search["location"] === "string" ? search["location"] : undefined,
  } as SearchResultsSearch),
  head: () => ({
    meta: [
      { title: "Search Results — SERVICONNECT" },
      { name: "description", content: "Compare sample professionals matching your service search in Abuja." },
      { property: "og:title", content: "Search Results — SERVICONNECT" },
      { property: "og:description", content: "Compare sample professionals matching your service search in Abuja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => {
    const search = Route.useSearch();
    return <SearchResultsPage service={search.service} location={search.location} />;
  },
});