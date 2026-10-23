import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin")({ component: AdminGate });

const links = [
  ["/admin", "Overview"],
  ["/admin/subjects", "Subjects"],
  ["/admin/topics", "Topics"],
  ["/admin/students", "Students"],
  ["/admin/payments", "Payments"],
  ["/admin/briefings", "Briefings"],
  ["/admin/tools", "Tools"],
] as const;

function AdminGate() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [ok, setOk] = useState(() => typeof sessionStorage !== "undefined" && sessionStorage.getItem("richmirabel-admin") === "1");
  const [error, setError] = useState("");
  if (!ok) {
    return (
      <form
        className="mx-auto mt-24 max-w-sm rounded-3xl border border-line bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("code") || "");
          const expected = import.meta.env.VITE_ADMIN_PASSCODE || "richmirabel";
          if (value !== expected) {
            setError("That passcode is not right.");
            return;
          }
          sessionStorage.setItem("richmirabel-admin", "1");
          setOk(true);
        }}
      >
        <h1 className="font-display text-3xl">Teacher sign in</h1>
        <label className="mt-4 block text-sm" htmlFor="code">Passcode</label>
        <input id="code" name="code" type="password" className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3" />
        {error && <p className="mt-2 text-sm">{error}</p>}
        <button className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg">Sign in</button>
      </form>
    );
  }
  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-ink p-5 text-primary-fg md:block">
        <p className="font-display text-2xl">Richmirabel</p>
        <p className="mt-1 text-xs text-primary-fg/60">Teacher view</p>
        <nav className="mt-8 space-y-1">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className={cn("block min-h-11 border-l-2 px-3 py-2.5 text-sm", path === to ? "border-brass text-primary-fg" : "border-transparent text-primary-fg/70 hover:text-primary-fg")}>
              {label}
            </Link>
          ))}
        </nav>
        <button type="button" className="mt-8 text-sm text-primary-fg/70" onClick={() => { sessionStorage.removeItem("richmirabel-admin"); setOk(false); }}>
          Sign out
        </button>
      </aside>
      <div>
        <div className="flex gap-2 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className={cn("inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm", path === to ? "bg-ink text-primary-fg" : "bg-soft")}>{label}</Link>
          ))}
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
