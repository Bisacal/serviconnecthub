import { createFileRoute } from "@tanstack/react-router";
import { FaqPage } from "@/components/marketplace";

export const Route = createFileRoute("/faq")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "FAQ — SERVICONNECT" }, { name: "description", content: "Answers to common SERVICONNECT marketplace questions." }, { property: "og:title", content: "FAQ — SERVICONNECT" }, { property: "og:description", content: "Answers to common SERVICONNECT marketplace questions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: FaqPage,
});