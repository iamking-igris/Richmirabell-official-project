import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CreditCard,
  GraduationCap,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { adminApi, billingApi, type AdminStudent } from "@/lib/backend";
import { useAdminQuery } from "@/lib/admin-query";
import { formatDate, formatDateTime, initials, statusLabel } from "@/lib/admin-format";
import {
  AdminEmpty,
  AdminError,
  AdminField,
  AdminPanel,
  AdminStat,
  AdminTableSkeleton,
  StatusBadge,
} from "@/lib/admin-ui";
import { ApiError } from "@/services/api/errors";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/students")({ component: AdminStudentsPage });

type AccessFilter = "all" | "access" | "no-access";
type SubscriptionFilter = "all" | "subscribed" | "not-subscribed";

const selectClass =
  "min-h-10 rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function AdminStudentsPage() {
  const { data, loading, error, errorStatus, reload } = useAdminQuery(
    () => adminApi.students(),
    { cacheKey: "admin:students", cacheMs: 15_000, pollMs: 60_000 },
  );
  const students = data ?? [];

  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>("all");
  const [examFilter, setExamFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const exams = useMemo(() => {
    const set = new Set<string>();
    for (const student of students) {
      for (const exam of student.exams ?? []) set.add(exam);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      if (q) {
        const haystack = [student.name, student.email, student.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (accessFilter === "access" && !student.hasAccess) return false;
      if (accessFilter === "no-access" && student.hasAccess) return false;
      if (subscriptionFilter === "subscribed" && !student.subscribed) return false;
      if (subscriptionFilter === "not-subscribed" && student.subscribed) return false;
      if (examFilter !== "all" && !(student.exams ?? []).includes(examFilter)) return false;
      return true;
    });
  }, [students, query, accessFilter, subscriptionFilter, examFilter]);

  const stats = useMemo(
    () => ({
      total: students.length,
      withAccess: students.filter((student) => student.hasAccess).length,
      subscribed: students.filter((student) => student.subscribed).length,
      onboarded: students.filter((student) => student.onboardingComplete).length,
    }),
    [students],
  );

  const selected = selectedId
    ? students.find((student) => student.id === selectedId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Students</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Real student accounts, access status, and subscription periods from the backend.
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
        <AdminStat label="Total students" value={stats.total} />
        <AdminStat label="With active access" value={stats.withAccess} hint="Backend has_access" />
        <AdminStat label="Subscribed" value={stats.subscribed} hint="Paid or manual subscription" />
        <AdminStat label="Onboarding complete" value={stats.onboarded} />
      </div>

      <AdminPanel>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or student ID…"
              className="min-h-10 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="sr-only" htmlFor="students-access-filter">
              Filter by access
            </label>
            <select
              id="students-access-filter"
              value={accessFilter}
              onChange={(event) => setAccessFilter(event.target.value as AccessFilter)}
              className={selectClass}
            >
              <option value="all">All access</option>
              <option value="access">Has access</option>
              <option value="no-access">No access</option>
            </select>
            <label className="sr-only" htmlFor="students-subscription-filter">
              Filter by subscription
            </label>
            <select
              id="students-subscription-filter"
              value={subscriptionFilter}
              onChange={(event) =>
                setSubscriptionFilter(event.target.value as SubscriptionFilter)
              }
              className={selectClass}
            >
              <option value="all">All subscriptions</option>
              <option value="subscribed">Subscribed</option>
              <option value="not-subscribed">Not subscribed</option>
            </select>
            <label className="sr-only" htmlFor="students-exam-filter">
              Filter by exam
            </label>
            <select
              id="students-exam-filter"
              value={examFilter}
              onChange={(event) => setExamFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All exams</option>
              {exams.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && !data && (
          <div className="p-4">
            <AdminTableSkeleton rows={6} columns={7} />
          </div>
        )}
        {!loading && error && (
          <div className="p-4">
            <AdminError message={error} status={errorStatus} onRetry={() => void reload()} />
          </div>
        )}
        {!loading && !error && students.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No students yet"
              description="Student accounts will appear here as soon as they register on the platform."
            />
          </div>
        )}
        {!loading && !error && students.length > 0 && filtered.length === 0 && (
          <div className="p-4">
            <AdminEmpty
              title="No students match these filters"
              description="Try clearing the search or choosing a different access, subscription, or exam filter."
            />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Exams</th>
                  <th className="px-4 py-3 font-semibold">JAMB subjects</th>
                  <th className="px-4 py-3 font-semibold">Access</th>
                  <th className="px-4 py-3 font-semibold">Subscription ends</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((student) => (
                  <tr
                    key={student.id}
                    className="cursor-pointer transition-colors hover:bg-paper/60"
                    onClick={() => setSelectedId(student.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(student.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{student.name || "Unnamed student"}</p>
                          <p className="truncate text-xs text-muted">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {(student.exams ?? []).length > 0 ? student.exams.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {(student.jambSubjects ?? []).length > 0
                        ? student.jambSubjects.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={student.hasAccess ? "ACTIVE" : "EXPIRED"} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {student.subscribed ? formatDate(student.subscriptionEndsAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(student.registeredAt || student.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(student.id);
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
        <StudentDetail
          student={selected}
          onClose={() => setSelectedId(null)}
          onGranted={reload}
        />
      )}
    </div>
  );
}

function StudentDetail({
  student,
  onClose,
  onGranted,
}: {
  student: AdminStudent;
  onClose: () => void;
  onGranted: () => Promise<void>;
}) {
  const [durationDays, setDurationDays] = useState("30");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  async function grantAccess() {
    const duration = Number(durationDays);
    if (!Number.isFinite(duration) || duration <= 0) {
      setFeedback({ type: "error", message: "Enter a valid duration in days." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await billingApi.grant(
        student.id,
        duration,
        reason.trim() || "Manual admin grant",
      );
      setFeedback({
        type: "success",
        message: `Access granted for ${duration} ${duration === 1 ? "day" : "days"}.`,
      });
      setReason("");
      await onGranted();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Could not grant access. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <h2 id="student-detail-title" className="font-display text-xl font-bold text-ink">
              {student.name || "Unnamed student"}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">{student.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Close student details"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Student ID">{student.id}</AdminField>
            <AdminField label="Role">{statusLabel(student.role)}</AdminField>
            <AdminField label="Exams">
              {(student.exams ?? []).length > 0 ? student.exams.join(", ") : "—"}
            </AdminField>
            <AdminField label="Exam month">{student.examMonth || "—"}</AdminField>
            <AdminField label="JAMB subjects">
              {(student.jambSubjects ?? []).length > 0 ? student.jambSubjects.join(", ") : "—"}
            </AdminField>
            <AdminField label="Selected subjects">
              {(student.selectedSubjects ?? []).length > 0
                ? student.selectedSubjects.join(", ")
                : "—"}
            </AdminField>
            <AdminField label="Onboarding">
              <StatusBadge status={student.onboardingComplete ? "ACTIVE" : "PENDING"} />
            </AdminField>
            <AdminField label="Access">
              <StatusBadge status={student.hasAccess ? "ACTIVE" : "EXPIRED"} />
            </AdminField>
            <AdminField label="Subscribed">
              <StatusBadge status={student.subscribed ? "ACTIVE" : "EXPIRED"} />
            </AdminField>
            <AdminField label="Subscription ends">
              {student.subscribed ? formatDate(student.subscriptionEndsAt) : "—"}
            </AdminField>
            <AdminField label="Registered">{formatDateTime(student.registeredAt)}</AdminField>
            <AdminField label="Created at">{formatDateTime(student.created_at)}</AdminField>
          </div>

          <div className="rounded-2xl border border-line bg-paper/60 p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" aria-hidden />
              <h3 className="font-display text-base font-semibold text-ink">Manual access grant</h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              Creates a real manual subscription in the backend and records an audit entry.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
              <div>
                <label
                  htmlFor="grant-duration"
                  className="block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Duration (days)
                </label>
                <input
                  id="grant-duration"
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label
                  htmlFor="grant-reason"
                  className="block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Reason (optional)
                </label>
                <input
                  id="grant-reason"
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Scholarship, support follow-up"
                  className="mt-1 min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            {feedback && (
              <p
                className={cn(
                  "mt-3 rounded-xl px-3 py-2 text-sm",
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                )}
              >
                {feedback.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => void grantAccess()}
              disabled={busy}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
            >
              <UserCheck className="size-4" aria-hidden />
              {busy ? "Granting…" : "Grant access"}
            </button>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-line pt-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden /> {statusLabel(student.role)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-3.5" aria-hidden /> {student.examMonth || "Exam month not set"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
