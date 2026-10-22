import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/service-categories")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
