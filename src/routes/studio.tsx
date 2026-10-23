import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Gate } from "@/components/shell";

export const Route = createFileRoute("/studio")({
  component: () => (
    <Gate>
      <Outlet />
    </Gate>
  ),
});
