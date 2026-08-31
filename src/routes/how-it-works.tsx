import { createFileRoute } from "@tanstack/react-router";
import { HowItWorksPage } from "@/components/marketplace";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [{ title: "How It Works — SERVICONNECT" }, { name: "description", content: "See how clients and service providers use SERVICONNECT." }, { property: "og:title", content: "How It Works — SERVICONNECT" }, { property: "og:description", content: "See how clients and service providers use SERVICONNECT." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: HowItWorksPage,
});