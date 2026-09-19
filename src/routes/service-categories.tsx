import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/service-categories")({
  component: () => <Outlet />,
});
