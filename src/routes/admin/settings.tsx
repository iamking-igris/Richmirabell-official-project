import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Globe,
  BookOpen,
  FileText,
  Users,
  Sparkles,
  CreditCard,
  Activity,
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
    description: "Platform name and core platform information.",
    icon: Globe,
  },
  {
    id: "academic",
    title: "Learning & Content",
    description: "Subject configuration and content publishing status.",
    icon: BookOpen,
  },
  {
    id: "examinations",
    title: "Examinations",
    description: "Default CBT duration and the Weekly CBT paper rules.",
    icon: FileText,
  },
  {
    id: "users",
    title: "Users & Access",
    description: "Registration, account access and administrator details.",
    icon: Users,
  },
  {
    id: "ai",
    title: "Gemini AI & OCR",
    description:
      "Gemini API key, model selection and connection testing — shared by OCR, notes extraction and CBT generation.",
    icon: Sparkles,
  },
  {
    id: "payments",
    title: "Payments & Integrations",
    description: "Paystack credentials, integration status and backend connection.",
    icon: CreditCard,
  },
  {
    id: "system",
    title: "System Status",
    description: "Backend and AI service health, diagnostics and audit log.",
    icon: Activity,
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
