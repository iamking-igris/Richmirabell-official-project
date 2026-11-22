import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { adminApi } from "@/lib/backend";
import { useAdminQuery } from "@/lib/admin-query";
import { formatDateTime, prettyDetail } from "@/lib/admin-format";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPanel,
} from "@/lib/admin-ui";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/audit")({ component: AdminAuditPage });

const selectClass =
  "min-h-10 rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function AdminAuditPage() {
  const { data, loading, error, errorStatus, reload } = useAdminQuery(() => adminApi.audit());
  const events = data ?? [];

  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const actions = useMemo(() => {
    const set = new Set<string>();
    for (const event of events) {
      if (event.action) set.add(event.action);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (actionFilter !== "all" && event.action !== actionFilter) return false;
      if (!q) return true;
      const haystack = [
        event.action,
        event.target,
        event.actorId,
        prettyDetail(event.detail),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [events, query, actionFilter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Audit &amp; security</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Administrative actions recorded by the backend. Read-only.
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

      <AdminPanel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search action, target, actor, or detail…"
              className="min-h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="audit-action-filter">
              Filter by action
            </label>
            <select
              id="audit-action-filter"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className={cn(selectClass, "w-full sm:w-auto")}
            >
              <option value="all">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="p-4"><AdminLoading label="Loading audit log…" /></div>}
        {!loading && error && (
          <div className="p-4">
            <AdminError message={error} status={errorStatus} onRetry={() => void reload()} />
          </div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No audit events yet"
              description="Administrative actions such as manual grants and plan changes will be recorded here."
            />
          </div>
        )}
        {!loading && !error && events.length > 0 && filtered.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No audit events match these filters"
              description="Try clearing the search or choosing a different action."
            />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <ul className="divide-y divide-line">
            {filtered.map((event) => {
              const detail = prettyDetail(event.detail);
              return (
                <li key={event.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-ink">{event.action}</p>
                      <p className="mt-0.5 break-words text-sm text-muted">
                        Target: {event.target || "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p>{formatDateTime(event.createdAt)}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        {event.actorId || "system"}
                      </p>
                    </div>
                  </div>
                  {detail && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-primary">
                        View detail
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-paper p-3 text-xs text-ink">
                        {detail}
                      </pre>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
