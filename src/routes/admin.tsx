import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/admin")({ component: AdminGate });

const links = [
  ["/admin", "Overview"],
  ["/admin/subjects", "Subjects & Content"],
  ["/admin/past-questions", "Past Questions"],
  ["/admin/cbt", "CBT Generator"],
  ["/admin/students", "Students"],
  ["/admin/subscriptions", "Subscriptions & Pricing"],
  ["/admin/payments", "Payments & Revenue"],
  ["/admin/settings", "Settings"],
] as const;

function AdminGate() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [ok, setOk] = useState(() => typeof sessionStorage !== "undefined" && sessionStorage.getItem("richmirabel-admin") === "1");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer whenever route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  // Close drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Prevent background scrolling while mobile navigation drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Determine active section label for mobile header
  const currentLink = links.find(([to]) =>
    to === "/admin" ? path === "/admin" : path.startsWith(to)
  );
  const currentLabel = currentLink ? currentLink[1] : "Admin Workspace";

  if (!ok) {
    return (
      <div className="min-h-screen bg-paper text-ink px-4 py-8 flex items-center justify-center">
        <form
          className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            const data = new FormData(e.currentTarget);
            const user = String(data.get("user") || "").trim().toLowerCase();
            const pass = String(data.get("pass") || "");
            setTimeout(() => {
              if (
                (user !== "admin" && user !== "admin@gmail.com") ||
                pass !== (import.meta.env.VITE_ADMIN_PASSCODE || "admin")
              ) {
                setError("Invalid credentials. Check your email and password.");
                setBusy(false);
                return;
              }
              sessionStorage.setItem("richmirabel-admin", "1");
              setOk(true);
              setBusy(false);
            }, 200);
          }}
        >
          <BrandMark />
          <h1 className="mt-6 font-display text-3xl">Admin sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Enter authorized administrator email and password below.
          </p>
          <label className="mt-5 block text-sm font-medium" htmlFor="user">
            Email or Username
          </label>
          <input
            id="user"
            name="user"
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm focus:border-primary focus:outline-none"
            placeholder="admin@gmail.com"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="pass">
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="pass"
              name="pass"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-paper px-3 py-3 pr-16 text-sm focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-50 hover:opacity-95 transition-opacity"
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

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[230px_1fr]">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Preserved Exactly: Styling, Width, Indicators, Layout)   */}
      {/* ========================================================================= */}
      <aside className="hidden bg-ink p-5 text-primary-fg md:flex md:flex-col md:justify-between md:h-screen md:sticky md:top-0">
        <div>
          <p className="font-display text-2xl">Richmirabel</p>
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
                      ? "border-brass text-primary-fg font-semibold"
                      : "border-transparent text-primary-fg/70 hover:text-primary-fg"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-primary-fg/70 hover:text-primary-fg transition-colors"
            onClick={() => {
              sessionStorage.removeItem("richmirabel-admin");
              setOk(false);
            }}
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE HEADER BAR & MOBILE DRAWER (Below md: 768px)                      */}
      {/* ========================================================================= */}
      <div className="min-w-0 w-full flex flex-col flex-1">
        {/* Sticky Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-3.5 py-3 backdrop-blur-xs md:hidden shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center size-10 shrink-0 rounded-xl border border-line bg-paper text-ink hover:bg-soft active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-display text-base sm:text-lg font-bold text-ink tracking-tight truncate">
                Richmirabel
              </span>
              <span className="rounded-full bg-crimson-100 px-2 py-0.5 text-[10px] font-bold text-crimson-800 shrink-0">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink truncate max-w-[130px] sm:max-w-[180px]">
              {currentLabel}
            </span>
          </div>
        </header>

        {/* Mobile Navigation Drawer Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-all duration-200 md:hidden",
            drawerOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />

        {/* Mobile Navigation Drawer Panel */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[285px] max-w-[85vw] flex-col justify-between bg-ink p-5 text-primary-fg shadow-2xl transition-all duration-200 ease-in-out overflow-y-auto md:hidden",
            drawerOpen ? "translate-x-0 visible pointer-events-auto" : "-translate-x-full invisible pointer-events-none"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Admin Navigation Menu"
        >
          <div>
            {/* Drawer Header with Close Button */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-display text-2xl font-bold tracking-tight">Richmirabel</p>
                <p className="mt-0.5 text-xs text-primary-fg/60">Admin · workspace</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center size-9 rounded-xl border border-white/10 bg-white/5 text-primary-fg hover:bg-white/15 transition-colors focus:outline-none"
                aria-label="Close navigation menu"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Navigation Destinations */}
            <nav className="mt-5 space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-primary-fg/40 mb-2">
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
                      "flex items-center justify-between min-h-11 border-l-2 px-3.5 py-2.5 text-sm font-medium transition-colors rounded-r-xl",
                      active
                        ? "border-brass text-primary-fg bg-white/10 font-bold"
                        : "border-transparent text-primary-fg/75 hover:text-primary-fg hover:bg-white/5"
                    )}
                  >
                    <span>{label}</span>
                    {active && <ChevronRight className="size-4 text-brass shrink-0" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer: Admin Info & Sign Out */}
          <div className="mt-8 border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-crimson-800 text-primary-fg font-display font-bold text-xs shrink-0">
                BN
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">Baba Ne</p>
                <p className="text-[11px] text-primary-fg/60 truncate">Super Administrator</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("richmirabel-admin");
                setOk(false);
                setDrawerOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-primary-fg/80 hover:bg-white/10 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="mx-auto max-w-5xl w-full min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
