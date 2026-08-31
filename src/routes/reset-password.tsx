import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/components/auth-pages";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a New Password — SERVICONNECT" }, { name: "description", content: "Choose a new password for your SERVICONNECT account." }, { property: "og:title", content: "Choose a New Password — SERVICONNECT" }, { property: "og:description", content: "Choose a new password for your SERVICONNECT account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ResetPasswordPage,
});