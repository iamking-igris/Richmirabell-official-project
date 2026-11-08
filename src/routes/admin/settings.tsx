import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Globe,
  BookOpen,
  Bell,
  Sparkles,
  ShieldCheck,
  Layers,
  Wrench,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsRoot,
});

const SETTINGS_CATEGORIES = [
  {
    id: "general",
    title: "General Platform",
    description: "Platform identity, branding, regional preferences, and maintenance mode.",
    icon: Globe,
  },
  {
    id: "academic",
    title: "Academic & Learning",
    description: "JAMB subjects, CBT examination defaults, and learning review rules.",
    icon: BookOpen,
  },
  {
    id: "notifications",
    title: "Notifications & Alerts",
    description: "Expiry reminders, payment receipts, and administrative security alerts.",
    icon: Bell,
  },
  {
    id: "ai",
    title: "Gemini AI & OCR",
    description: "AI vision model selection, KaTeX LaTeX detection, and connection test.",
    icon: Sparkles,
  },
  {
    id: "security",
    title: "Admin Access & Security",
    description: "Administrator profile, security credentials, and role permissions matrix.",
    icon: ShieldCheck,
  },
  {
    id: "integrations",
    title: "Integrations & Status",
    description: "Connected system services, storage health, and integration overview.",
    icon: Layers,
  },
  {
    id: "developer",
    title: "Advanced / Developer Tools",
    description: "Local data management, attempt resets, and confirmation-protected maintenance.",
    icon: Wrench,
  },
] as const;

export function AdminSettingsRoot() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // If visiting a child category route, render Outlet
  if (path.startsWith("/admin/settings/") && path !== "/admin/settings" && path !== "/admin/settings/") {
    return <Outlet />;
  }

  return <AdminSettingsLanding />;
}

export function AdminSettingsLanding() {
  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header */}
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
          Manage your platform configuration, academic preferences, notifications, integrations, and administrator controls. Select a category below to manage settings.
        </p>
      </header>

      {/* Category Navigation Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              to={`/admin/settings/${cat.id}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 text-left shadow-2xs hover:border-primary/60 hover:bg-paper hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold text-ink group-hover:text-primary transition-colors">
                    {cat.title}
                  </h2>
                  <p className="mt-1.5 text-xs text-muted leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1 text-[11px] font-semibold text-primary/80 group-hover:text-primary">
                <span>Manage settings</span>
                <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
