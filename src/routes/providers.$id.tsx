import { createFileRoute } from "@tanstack/react-router";
import { ProviderProfilePage } from "@/components/marketplace";

export const Route = createFileRoute("/providers/$id")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "Provider Profile — SERVICONNECT" }, { name: "description", content: "View a trusted SERVICONNECT professional profile." }, { property: "og:title", content: "Provider Profile — SERVICONNECT" }, { property: "og:description", content: "View a trusted SERVICONNECT professional profile." }, { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <ProviderProfilePage id={Route.useParams().id} />,
});