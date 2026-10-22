import { createFileRoute } from "@tanstack/react-router";
import { BlogArticlePage } from "@/components/marketplace";
import { getBlogPostBySlug } from "@/lib/marketplace-data";

export const Route = createFileRoute("/blog/$slug")({
  staticData: { sitemap: true },
  head: ({ params }) => {
    const post = getBlogPostBySlug(params.slug);
    const title = post ? `${post.title} — SERVICONNECT Journal` : "SERVICONNECT Journal";
    const description = post
      ? post.summary
      : "A SERVICONNECT journal article about trusted services.";
    const url = `https://serviconnecthub.com/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: post
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title,
                description: post.summary,
                datePublished: post.date,
                author: { "@type": "Organization", name: "SERVICONNECT" },
              }),
            },
          ]
        : [],
    };
  },
  component: () => <BlogArticlePage slug={Route.useParams().slug} />,
});
