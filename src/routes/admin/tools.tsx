import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { API_CONFIG } from "@/services/api/config";
import { AdminPanel } from "@/lib/admin-ui";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/tools")({ component: AdminToolsPage });

export function AdminToolsPage() {
  const refreshAll = useSession((state) => state.refreshAll);
  const status = useSession((state) => state.status);
  const role = useSession((state) => state.role);
  const [busy, setBusy] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  async function refreshBackendData() {
    setBusy(true);
    try {
      await refreshAll();
      setLastRefreshed(new Date().toLocaleString("en-NG"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Tools</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Safe diagnostics and navigation shortcuts. These actions only read from or refresh the
          backend; they never modify or delete platform data.
        </p>
      </header>

      <AdminPanel
        title="Refresh backend data"
        description="Re-fetch your profile, progress, and access state from the API."
      >
        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={() => void refreshBackendData()}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", busy && "animate-spin")} aria-hidden />
            {busy ? "Refreshing…" : "Refresh backend data"}
          </button>
          <p className="text-xs text-muted">
            {lastRefreshed
              ? `Last refresh requested: ${lastRefreshed}`
              : "No refresh requested in this session."}
          </p>
        </div>
      </AdminPanel>

      <AdminPanel title="Diagnostics" description="Read-only connection details.">
        <dl className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              API base URL
            </dt>
            <dd className="mt-1 break-all font-mono text-sm text-ink">{API_CONFIG.baseUrl}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Session status
            </dt>
            <dd className="mt-1 text-sm text-ink">{status}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Role</dt>
            <dd className="mt-1 text-sm text-ink">{role ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Request timeout
            </dt>
            <dd className="mt-1 text-sm text-ink">{API_CONFIG.timeoutMs / 1000}s</dd>
          </div>
        </dl>
      </AdminPanel>

      <AdminPanel title="Operational pages" description="Jump to live backend data.">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <ToolLink to="/admin/students" icon={<Users className="size-4" />} label="Students" />
          <ToolLink
            to="/admin/payments"
            icon={<CreditCard className="size-4" />}
            label="Payments"
          />
          <ToolLink
            to="/admin/subscriptions"
            icon={<CreditCard className="size-4" />}
            label="Subscriptions"
          />
          <ToolLink
            to="/admin/analytics"
            icon={<BarChart3 className="size-4" />}
            label="Analytics"
          />
          <ToolLink to="/admin/audit" icon={<ShieldCheck className="size-4" />} label="Audit log" />
          <a
            href={API_CONFIG.baseUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper/60 px-4 py-3 text-sm font-semibold text-ink hover:border-primary/50"
          >
            <span>API endpoint</span>
            <ExternalLink className="size-4 text-muted" aria-hidden />
          </a>
        </div>
      </AdminPanel>
    </div>
  );
}

function ToolLink({
  to,
  icon,
  label,
}: {
  to: "/admin/students" | "/admin/payments" | "/admin/subscriptions" | "/admin/analytics" | "/admin/audit";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper/60 px-4 py-3 text-sm font-semibold text-ink hover:border-primary/50"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-xs text-muted">Open</span>
    </Link>
  );
}
