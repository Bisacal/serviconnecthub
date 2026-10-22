import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { BlogPage } from "@/components/marketplace";

export const Route = createFileRoute("/blog")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Journal — SERVICONNECT" }, { name: "description", content: "Useful ideas for finding trusted professionals and getting things done." }, { property: "og:title", content: "Journal — SERVICONNECT" }, { property: "og:description", content: "Useful ideas for finding trusted professionals and getting things done." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: BlogLayout,
});

function BlogLayout() {
  return <Outlet />;
}