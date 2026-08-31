import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-pages";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({ mode: search.mode === "signup" ? "signup" as const : "login" as const, role: search.role === "provider" ? "provider" as const : "client" as const }),
  head: () => ({ meta: [{ title: "Sign in or Join — SERVICONNECT" }, { name: "description", content: "Sign in to SERVICONNECT or create a client or service provider account." }, { property: "og:title", content: "Sign in or Join — SERVICONNECT" }, { property: "og:description", content: "Sign in to SERVICONNECT or create a client or service provider account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthPage,
});