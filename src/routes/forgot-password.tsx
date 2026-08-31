import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/components/auth-pages";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — SERVICONNECT" }, { name: "description", content: "Request a secure SERVICONNECT password reset link." }, { property: "og:title", content: "Reset Password — SERVICONNECT" }, { property: "og:description", content: "Request a secure SERVICONNECT password reset link." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ForgotPasswordPage,
});