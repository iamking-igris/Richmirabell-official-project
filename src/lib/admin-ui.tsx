import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusLabel, statusTone } from "@/lib/admin-format";

export function AdminStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-display text-2xl leading-tight text-ink sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusTone(status),
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function AdminError({
  message,
  status,
  onRetry,
}: {
  message: string;
  status?: number | null;
  onRetry?: () => void;
}) {
  const unauthorized = status === 401;
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-800">
            {unauthorized ? "Your session has expired" : "Could not load data"}
          </p>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {unauthorized ? (
              <Link
                to="/login"
                className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg"
              >
                Sign in again
              </Link>
            ) : (
              onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-red-300 bg-surface px-4 text-sm font-semibold text-red-700"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Try again
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <Inbox className="mx-auto size-8 text-muted opacity-60" aria-hidden />
      <p className="mt-3 font-display text-lg font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      )}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

export function AdminSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-soft", className)}
      aria-hidden="true"
    />
  );
}

export function AdminStatSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-label="Loading statistics" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-4">
          <AdminSkeleton className="h-8 w-20" />
          <AdminSkeleton className="mt-2 h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Loading table" aria-busy="true">
      <div className="grid border-b border-line px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(80px, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <AdminSkeleton key={index} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid border-b border-line px-4 py-4 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(80px, 1fr))` }}>
          {Array.from({ length: columns }).map((_, column) => (
            <AdminSkeleton key={column} className="h-4 w-[70%]" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminNotice({
  tone = "success",
  message,
  onClose,
}: {
  tone?: "success" | "warning" | "error";
  message: string;
  onClose?: () => void;
}) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm", toneClass)}>
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="min-h-6 shrink-0 font-bold" aria-label="Dismiss notification">
          ×
        </button>
      )}
    </div>
  );
}

export function PageCardSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading content" aria-busy="true">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-5">
          <AdminSkeleton className="size-5" />
          <AdminSkeleton className="mt-4 h-7 w-2/3" />
          <AdminSkeleton className="mt-3 h-4 w-full" />
          <AdminSkeleton className="mt-2 h-4 w-4/5" />
          <AdminSkeleton className="mt-5 h-10 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageContentSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-label="Loading page" aria-busy="true">
      <div>
        <AdminSkeleton className="h-9 w-72 max-w-[80%]" />
        <AdminSkeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-8">
        <AdminSkeleton className="h-5 w-40" />
        <AdminSkeleton className="mt-5 h-4 w-full" />
        <AdminSkeleton className="mt-3 h-4 w-[92%]" />
        <AdminSkeleton className="mt-3 h-4 w-[84%]" />
        <AdminSkeleton className="mt-8 h-4 w-1/2" />
        <AdminSkeleton className="mt-3 h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
