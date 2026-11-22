import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Pencil,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import {
  adminApi,
  billingApi,
  type AdminPlan,
  type AdminSubscription,
} from "@/lib/backend";
import { useAdminQuery } from "@/lib/admin-query";
import {
  formatDate,
  formatNaira,
  initials,
  sourceLabel,
  statusLabel,
} from "@/lib/admin-format";
import {
  AdminEmpty,
  AdminError,
  AdminField,
  AdminLoading,
  AdminPanel,
  AdminStat,
  StatusBadge,
} from "@/lib/admin-ui";
import { ApiError } from "@/services/api/errors";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

interface SubscriptionsData {
  subscriptions: AdminSubscription[];
  plans: AdminPlan[];
}

const selectClass =
  "min-h-10 rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function AdminSubscriptionsPage() {
  const { data, loading, error, errorStatus, reload } = useAdminQuery<SubscriptionsData>(
    async () => {
      const [subscriptions, plans] = await Promise.all([
        adminApi.subscriptions(),
        adminApi.plans(),
      ]);
      return { subscriptions, plans };
    },
  );

  const subscriptions = data?.subscriptions ?? [];
  const plans = data?.plans ?? [];

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);

  const planNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of plans) map.set(plan.id, plan.name);
    return map;
  }, [plans]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const subscription of subscriptions) {
      if (subscription.status) set.add(subscription.status);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subscriptions]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const subscription of subscriptions) {
      if (subscription.source) set.add(subscription.source);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subscriptions]);

  const stats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let manual = 0;
    let payment = 0;
    for (const subscription of subscriptions) {
      const status = subscription.status.toUpperCase();
      if (status === "ACTIVE") active += 1;
      if (status === "EXPIRED") expired += 1;
      const source = subscription.source.toUpperCase();
      if (source === "MANUAL") manual += 1;
      if (source === "PAYMENT") payment += 1;
    }
    return { active, expired, manual, payment, total: subscriptions.length };
  }, [subscriptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      if (q) {
        const planName = planNames.get(subscription.planId) ?? "";
        const haystack = [
          subscription.studentName,
          subscription.studentEmail,
          subscription.studentId,
          planName,
          subscription.paymentId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== "all" && subscription.status !== statusFilter) return false;
      if (sourceFilter !== "all" && subscription.source !== sourceFilter) return false;
      return true;
    });
  }, [subscriptions, query, statusFilter, sourceFilter, planNames]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Subscriptions &amp; pricing</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Real subscription periods and backend-owned plans. Plan edits are saved to the backend.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat label="Active subscriptions" value={stats.active} />
        <AdminStat label="Expired subscriptions" value={stats.expired} />
        <AdminStat label="Paid subscriptions" value={stats.payment} hint="Source: PAYMENT" />
        <AdminStat label="Manual grants" value={stats.manual} hint="Source: MANUAL" />
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        <UserCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          Manual grants are created from the{" "}
          <Link to="/admin/students" className="font-semibold text-primary hover:underline">
            Students
          </Link>{" "}
          page so every grant is attached to a real student account and audit entry.
        </p>
      </div>

      <AdminPanel
        title="Subscriptions"
        description="Backend records with student, plan, source, and access period."
      >
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by student, plan, or payment reference…"
              className="min-h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="sr-only" htmlFor="subscriptions-status-filter">
              Filter by status
            </label>
            <select
              id="subscriptions-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="subscriptions-source-filter">
              Filter by source
            </label>
            <select
              id="subscriptions-source-filter"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {sourceLabel(source)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="p-4">
            <AdminLoading label="Loading subscriptions and plans…" />
          </div>
        )}
        {!loading && error && (
          <div className="p-4">
            <AdminError message={error} status={errorStatus} onRetry={() => void reload()} />
          </div>
        )}
        {!loading && !error && subscriptions.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No subscriptions yet"
              description="Paid and manually granted subscriptions will appear here."
            />
          </div>
        )}
        {!loading && !error && subscriptions.length > 0 && filtered.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No subscriptions match these filters"
              description="Try clearing the search or choosing a different status or source."
            />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(subscription.studentName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {subscription.studentName || "Unknown student"}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {subscription.studentEmail || subscription.studentId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {planNames.get(subscription.planId) || subscription.planId}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subscription.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">{sourceLabel(subscription.source)}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(subscription.startsAt)} – {formatDate(subscription.endsAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {subscription.paymentId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <AdminPanel
        title="Plans"
        description="Backend-owned pricing. Editing a plan updates the real billing configuration."
      >
        {loading && (
          <div className="p-4">
            <AdminLoading label="Loading plans…" />
          </div>
        )}
        {!loading && error && (
          <div className="p-4">
            <AdminError message={error} status={errorStatus} onRetry={() => void reload()} />
          </div>
        )}
        {!loading && !error && plans.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No plans configured"
              description="Subscription plans are managed by the backend. Add plans there to see them here."
            />
          </div>
        )}
        {!loading && !error && plans.length > 0 && (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-line bg-paper/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-ink">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{plan.id}</p>
                  </div>
                  <StatusBadge status={plan.active ? "ACTIVE" : "EXPIRED"} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Price</p>
                    <p className="mt-0.5 font-semibold text-ink">{formatNaira(plan.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Duration</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {plan.durationDays} {plan.durationDays === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-primary hover:bg-paper"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Edit plan
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {plan.durationDays} day term
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      {editingPlan && (
        <PlanEditor
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => {
            setEditingPlan(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function PlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan: AdminPlan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price));
  const [durationDays, setDurationDays] = useState(String(plan.durationDays));
  const [active, setActive] = useState(plan.active);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save() {
    const trimmedName = name.trim();
    const numericPrice = Number(price);
    const numericDuration = Number(durationDays);

    if (!trimmedName) {
      setFeedback("Plan name is required.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setFeedback("Enter a valid price (0 or more).");
      return;
    }
    if (!Number.isFinite(numericDuration) || numericDuration < 1) {
      setFeedback("Enter a duration of at least 1 day.");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await billingApi.updatePlan(plan.id, {
        name: trimmedName,
        price: numericPrice,
        duration_days: numericDuration,
        active,
      });
      onSaved();
    } catch (err) {
      setFeedback(
        err instanceof ApiError ? err.message : "Could not update the plan. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-editor-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Edit plan
            </p>
            <h2 id="plan-editor-title" className="mt-0.5 font-display text-xl font-bold text-ink">
              {plan.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Close plan editor"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="plan-name" className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Name
            </label>
            <input
              id="plan-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-price" className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Price (₦)
              </label>
              <input
                id="plan-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="plan-duration" className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Duration (days)
              </label>
              <input
                id="plan-duration"
                type="number"
                min={1}
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 rounded border-line text-primary focus:ring-primary"
            />
            Plan is active
          </label>

          {feedback && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{feedback}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted">
              <CreditCard className="size-3.5" aria-hidden />
              Saved to the backend billing configuration.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-9 rounded-full border border-line px-4 text-sm font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" aria-hidden />
                {busy ? "Saving…" : "Save plan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
