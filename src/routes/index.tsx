import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/marketplace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SERVICONNECT — Find Trusted Professionals" },
      { name: "description", content: "Find trusted tutors, mechanics, electricians, solar installers and more across Abuja." },
      { property: "og:title", content: "SERVICONNECT — Find Trusted Professionals" },
      { property: "og:description", content: "Find trusted tutors, mechanics, electricians, solar installers and more across Abuja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});