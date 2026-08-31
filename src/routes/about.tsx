import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/marketplace";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About SERVICONNECT" }, { name: "description", content: "Learn why SERVICONNECT is building a trusted services marketplace for Nigeria." }, { property: "og:title", content: "About SERVICONNECT" }, { property: "og:description", content: "Learn why SERVICONNECT is building a trusted services marketplace for Nigeria." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AboutPage,
});