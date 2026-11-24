import { Link } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { useEffect } from "react";

export function AppNotFoundComponent() {
  const status = useSession((state) => state.status);
  const role = useSession((state) => state.role);
  const onboardingComplete = useSession((state) => state.onboardingComplete);

  useEffect(() => {
    if (status === "idle") void useSession.getState().restore().catch(() => undefined);
  }, [status]);

  if (status === "idle" || status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-primary">Richmirabel</p>
          <h1 className="mt-3 font-display text-3xl text-ink">Loading your account…</h1>
        </div>
      </main>
    );
  }

  const destination =
    status === "anonymous" || (!role && status !== "authenticated")
      ? "/login"
      : role === "ADMIN"
      ? "/admin"
      : onboardingComplete
      ? "/studio"
      : "/start";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-primary">Richmirabel</p>
        <h1 className="mt-3 font-display text-3xl text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          This page is not available. Your account and saved progress are unchanged.
        </p>
        <Link
          to={destination}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-fg"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
