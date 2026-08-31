import { createFileRoute } from "@tanstack/react-router";
import { BlogArticlePage } from "@/components/marketplace";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({ meta: [{ title: "SERVICONNECT Journal" }, { name: "description", content: "A SERVICONNECT journal article about trusted services." }, { property: "og:title", content: "SERVICONNECT Journal" }, { property: "og:description", content: "A SERVICONNECT journal article about trusted services." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <BlogArticlePage slug={Route.useParams().slug} />,
});