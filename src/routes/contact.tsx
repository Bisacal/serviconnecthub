import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/marketplace";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "Contact SERVICONNECT" }, { name: "description", content: "Get in touch with the SERVICONNECT team." }, { property: "og:title", content: "Contact SERVICONNECT" }, { property: "og:description", content: "Get in touch with the SERVICONNECT team." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ContactPage,
});