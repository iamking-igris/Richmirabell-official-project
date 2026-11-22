import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Search,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { adminApi, type AdminTransaction } from "@/lib/backend";
import { useAdminQuery } from "@/lib/admin-query";
import { formatDateTime, formatNaira, initials, statusLabel } from "@/lib/admin-format";
import {
  AdminEmpty,
  AdminError,
  AdminField,
  AdminLoading,
  AdminPanel,
  AdminStat,
  StatusBadge,
} from "@/lib/admin-ui";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/payments")({ component: AdminPaymentsPage });

const selectClass =
  "min-h-10 rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function AdminPaymentsPage() {
  const { data, loading, error, errorStatus, reload } = useAdminQuery(() =>
    adminApi.transactions(),
  );
  const transactions = data ?? [];

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const transaction of transactions) {
      if (transaction.provider) set.add(transaction.provider);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const transaction of transactions) {
      if (transaction.status) set.add(transaction.status);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const summary = useMemo(() => {
    let successfulRevenue = 0;
    let successfulCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    for (const transaction of transactions) {
      const status = transaction.status.toUpperCase();
      if (status === "SUCCESS" || status === "SUCCESSFUL") {
        successfulRevenue += transaction.amount;
        successfulCount += 1;
      } else if (status === "PENDING") {
        pendingAmount += transaction.amount;
        pendingCount += 1;
      } else if (status === "FAILED") {
        failedCount += 1;
      }
    }
    return {
      successfulRevenue,
      successfulCount,
      pendingAmount,
      pendingCount,
      failedCount,
      total: transactions.length,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (q) {
        const haystack = [
          transaction.reference,
          transaction.studentName,
          transaction.studentEmail,
          transaction.planName,
          transaction.studentId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
      if (providerFilter !== "all" && transaction.provider !== providerFilter) return false;
      return true;
    });
  }, [transactions, query, statusFilter, providerFilter]);

  const selected = selectedId
    ? transactions.find((transaction) => transaction.id === selectedId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Payments &amp; revenue</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Real payment records from the backend. Totals are calculated only from recorded
            transactions.
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
        <AdminStat
          label="Successful revenue"
          value={formatNaira(summary.successfulRevenue)}
          hint={`${summary.successfulCount} successful ${summary.successfulCount === 1 ? "payment" : "payments"}`}
        />
        <AdminStat
          label="Pending payments"
          value={summary.pendingCount}
          hint={formatNaira(summary.pendingAmount)}
        />
        <AdminStat label="Failed payments" value={summary.failedCount} />
        <AdminStat label="All transactions" value={summary.total} />
      </div>

      <AdminPanel>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by reference, student, or plan…"
              className="min-h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="sr-only" htmlFor="payments-status-filter">
              Filter by status
            </label>
            <select
              id="payments-status-filter"
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
            <label className="sr-only" htmlFor="payments-provider-filter">
              Filter by provider
            </label>
            <select
              id="payments-provider-filter"
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All providers</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="p-4"><AdminLoading label="Loading transactions…" /></div>}
        {!loading && error && (
          <div className="p-4">
            <AdminError message={error} status={errorStatus} onRetry={() => void reload()} />
          </div>
        )}
        {!loading && !error && transactions.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No payments recorded yet"
              description="Transactions will appear here after students start paying for access."
            />
          </div>
        )}
        {!loading && !error && transactions.length > 0 && filtered.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No transactions match these filters"
              description="Try clearing the search or choosing a different status or provider."
            />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="cursor-pointer transition-colors hover:bg-paper/60"
                    onClick={() => setSelectedId(transaction.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink">{transaction.reference}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(transaction.studentName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {transaction.studentName || "Unknown student"}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {transaction.studentEmail || transaction.studentId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{transaction.planName || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {formatNaira(transaction.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">{transaction.provider || "—"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(transaction.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(transaction.id);
                        }}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-paper"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {selected && (
        <TransactionDetail transaction={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function TransactionDetail({
  transaction,
  onClose,
}: {
  transaction: AdminTransaction;
  onClose: () => void;
}) {
  const status = transaction.status.toUpperCase();
  const Icon =
    status === "SUCCESS" || status === "SUCCESSFUL"
      ? CheckCircle2
      : status === "PENDING"
        ? Clock
        : XCircle;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Transaction
            </p>
            <h2
              id="transaction-detail-title"
              className="mt-0.5 break-all font-mono text-lg font-bold text-ink"
            >
              {transaction.reference}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Close transaction details"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-surface text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{statusLabel(transaction.status)}</p>
                <p className="text-xs text-muted">{transaction.provider || "Unknown provider"}</p>
              </div>
            </div>
            <p className="font-display text-2xl text-ink">{formatNaira(transaction.amount)}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Student">{transaction.studentName || "—"}</AdminField>
            <AdminField label="Student email">{transaction.studentEmail || "—"}</AdminField>
            <AdminField label="Student ID">{transaction.studentId}</AdminField>
            <AdminField label="Plan">{transaction.planName || "—"}</AdminField>
            <AdminField label="Plan ID">{transaction.planId || "—"}</AdminField>
            <AdminField label="Provider">{transaction.provider || "—"}</AdminField>
            <AdminField label="Created at">{formatDateTime(transaction.createdAt)}</AdminField>
            <AdminField label="Transaction ID">{transaction.id}</AdminField>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/60 p-3 text-xs text-muted">
            <CreditCard className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Refunds are not available through the current backend. Contact the payment provider
              for reversal requests.
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <TrendingUp className="size-3.5" aria-hidden />
            Only successful payments are counted as revenue.
          </div>
        </div>
      </div>
    </div>
  );
}
