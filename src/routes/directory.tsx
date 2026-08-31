import { createFileRoute } from "@tanstack/react-router";
import { DirectoryPage } from "@/components/marketplace";

export const Route = createFileRoute("/directory")({
  validateSearch: (search: Record<string, unknown>) => ({ service: typeof search.service === "string" ? search.service : "", location: typeof search.location === "string" ? search.location : "Abuja, FCT" }),
  head: () => ({ meta: [{ title: "Find a Professional — SERVICONNECT" }, { name: "description", content: "Search trusted professionals by service and location in Abuja." }, { property: "og:title", content: "Find a Professional — SERVICONNECT" }, { property: "og:description", content: "Search trusted professionals by service and location in Abuja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: DirectoryPage,
});