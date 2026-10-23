import { createFileRoute, redirect } from "@tanstack/react-router";

// One dashboard lives at /studio. Old links land there.
export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
