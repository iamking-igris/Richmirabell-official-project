import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/news")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/guides" });
  },
});
