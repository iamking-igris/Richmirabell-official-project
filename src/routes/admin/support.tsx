import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail } from "lucide-react";
import { AdminEmpty, AdminPanel } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/support")({ component: AdminSupportPage });

const SUPPORT_EMAIL = "support@richmirabel.ng";

export function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Support</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Administrative support tools and escalation contacts.
        </p>
      </header>

      <AdminEmpty
        title="Support ticketing is not enabled in this MVP"
        description="The backend does not expose a ticket API yet, so no tickets are created or stored here. Use the contact options below for real support requests."
      >
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
        >
          <Mail className="size-4" aria-hidden />
          Email support
        </a>
        <Link
          to="/studio/help"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink"
        >
          <LifeBuoy className="size-4" aria-hidden />
          Student help centre
        </Link>
      </AdminEmpty>

      <AdminPanel title="Contact details" description="Direct channels for operational issues.">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-paper/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-1 inline-block break-all text-sm font-semibold text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="rounded-2xl border border-line bg-paper/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ticketing status
            </p>
            <p className="mt-1 text-sm text-ink">Not available in this MVP</p>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
