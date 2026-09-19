import { createFileRoute } from "@tanstack/react-router";
import { CategoryDetailPage } from "@/components/marketplace";
import { getCategoryBySlug } from "@/lib/marketplace-data";

export const Route = createFileRoute("/service-categories/$slug")({
  head: ({ params }) => {
    const category = getCategoryBySlug(params.slug);
    const title = category ? `${category.name} — SERVICONNECT` : "Category — SERVICONNECT";
    const description = category ? category.description : "Browse service categories on SERVICONNECT.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: () => {
    const { slug } = Route.useParams();
    return <CategoryDetailPage slug={slug} />;
  },
});
