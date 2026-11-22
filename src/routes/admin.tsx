import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { adminApi } from "@/lib/backend";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { ApiError } from "@/services/api/errors";

const FALLBACK_PLATFORM_NAME = "Richmirabel";

/** Module-level cache: the platform name is fetched once per page load. */
let cachedPlatformName: string | null = null;
let platformNamePromise: Promise<string> | null = null;

function fetchPlatformName(): Promise<string> {
  if (cachedPlatformName) return Promise.resolve(cachedPlatformName);
  if (!platformNamePromise) {
    platformNamePromise = adminApi
      .platformSettings()
      .then((settings) => {
        cachedPlatformName = settings.general.platform_name.trim() || FALLBACK_PLATFORM_NAME;
        return cachedPlatformName;
      })
      .catch(() => FALLBACK_PLATFORM_NAME);
  }
  return platformNamePromise;
}

function usePlatformName(enabled: boolean): string {
  const [name, setName] = useState(cachedPlatformName ?? FALLBACK_PLATFORM_NAME);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchPlatformName().then((next) => {
      if (!cancelled) setName(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return name;
}

export const Route = createFileRoute("/admin")({ component: AdminGate });

const links = [
  ["/admin", "Overview"],
  ["/admin/subjects", "Subjects & Content"],
  ["/admin/cbt", "CBT Generator"],
  ["/admin/students", "Students"],
  ["/admin/subscriptions", "Subscriptions & Pricing"],
  ["/admin/payments", "Payments & Revenue"],
  ["/admin/analytics", "Analytics"],
  ["/admin/audit", "Audit Log"],
  ["/admin/ai", "AI & OCR"],
  ["/admin/settings", "Settings"],
] as const;

function AdminGate() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  const login = useSession((s) => s.login);
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const platformName = usePlatformName(status === "authenticated" && user?.role === "ADMIN");

  useEffect(() => {
    if (status === "idle") void useSession.getState().restore();
  }, [status]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && drawerOpen) setDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const currentLink = links.find(([to]) => (to === "/admin" ? path === "/admin" : path.startsWith(to)));
  const currentLabel = currentLink ? currentLink[1] : "Admin Workspace";

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center">
          <BrandMark />
          <p className="mt-5 text-sm text-muted">Checking administrator session…</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-8">
        <form
          className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-sm"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const data = new FormData(event.currentTarget);
            const email = String(data.get("email") || "").trim().toLowerCase();
            const password = String(data.get("password") || "");
            try {
              const signedIn = await login(email, password);
              if (signedIn.role !== "ADMIN") {
                await logout();
                setError("That account is not an administrator.");
                return;
              }
              setError("");
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <BrandMark />
          <h1 className="mt-6 font-display text-3xl">Admin sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Use an administrator account created in the Richmirabel backend.
          </p>
          {user && user.role !== "ADMIN" && (
            <p className="mt-3 rounded-xl border border-line bg-soft px-3 py-2 text-sm text-muted">
              Signed in as {user.email}. This account does not have admin access.
            </p>
          )}
          <label className="mt-5 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm focus:border-primary focus:outline-none"
            placeholder="admin@example.com"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-paper px-3 py-3 pr-16 text-sm focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-primary"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-muted hover:text-ink">
              ← Return to regular sign in
            </Link>
          </div>
        </form>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[230px_1fr]">
      <aside className="hidden h-screen flex-col justify-between bg-ink p-5 text-primary-fg md:sticky md:top-0 md:flex">
        <div>
          <p className="font-display text-2xl">{platformName}</p>
          <p className="mt-1 text-xs text-primary-fg/60">Admin Workspace</p>
          <nav className="mt-6 space-y-0.5">
            {links.map(([to, label]) => {
              const active = path === to || (to !== "/admin" && path.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "block min-h-10 border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-brass font-semibold text-primary-fg"
                      : "border-transparent text-primary-fg/70 hover:text-primary-fg",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-primary-fg/60">{user.email}</p>
          <button
            type="button"
            className="mt-3 flex items-center gap-2 text-sm text-primary-fg/70 transition-colors hover:text-primary-fg"
            onClick={async () => {
              await logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex w-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-3.5 py-3 shadow-2xs backdrop-blur-xs md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-paper text-ink transition-all hover:bg-soft focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
            >
              <Menu className="size-5" />
            </button>
            <div className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="truncate font-display text-base font-bold tracking-tight text-ink sm:text-lg">
                {platformName}
              </span>
              <span className="shrink-0 rounded-full bg-crimson-100 px-2 py-0.5 text-[10px] font-bold text-crimson-800">
                Admin
              </span>
            </div>
          </div>
          <span className="max-w-[130px] truncate rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink sm:max-w-[180px]">
            {currentLabel}
          </span>
        </header>

        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-all duration-200 md:hidden",
            drawerOpen ? "visible opacity-100" : "invisible opacity-0",
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[285px] max-w-[85vw] flex-col justify-between overflow-y-auto bg-ink p-5 text-primary-fg shadow-2xl transition-all duration-200 ease-in-out md:hidden",
            drawerOpen ? "visible translate-x-0" : "invisible -translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation menu"
        >
          <div>
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-display text-2xl font-bold tracking-tight">{platformName}</p>
                <p className="mt-0.5 text-xs text-primary-fg/60">Admin · workspace</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-primary-fg transition-colors hover:bg-white/15 focus:outline-none"
                aria-label="Close navigation menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-5 space-y-1">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-primary-fg/40">
                Navigation
              </p>
              {links.map(([to, label]) => {
                const active = path === to || (to !== "/admin" && path.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center justify-between rounded-r-xl border-l-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-brass bg-white/10 font-bold text-primary-fg"
                        : "border-transparent text-primary-fg/75 hover:bg-white/5 hover:text-primary-fg",
                    )}
                  >
                    <span>{label}</span>
                    {active && <ChevronRight className="size-4 shrink-0 text-brass" />}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-8 space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-crimson-800 font-display text-xs font-bold text-primary-fg">
                {initials || "AD"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{user.name}</p>
                <p className="truncate text-[11px] text-primary-fg/60">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setDrawerOpen(false);
                await logout();
                navigate({ to: "/login" });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-primary-fg/80 transition-colors hover:bg-white/10"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
