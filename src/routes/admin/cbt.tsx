import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  CalendarClock,
  FileCheck2,
  Gauge,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { weeklyExamsApi, type WeeklyExam, type WeeklyExamStatus } from "@/lib/backend";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/admin/cbt")({ component: WeeklyCbtControlCenter });

const SUBJECT_COUNTS: Record<string, number> = {
  english: 60,
  mathematics: 40,
  physics: 40,
  chemistry: 40,
  biology: 40,
};

const SUBJECT_LABELS: Record<string, string> = {
  english: "Use of English",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  generation_failed: "Generation failed",
  needs_review: "Needs review",
  ready_to_publish: "Ready to publish",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-soft text-muted",
  generating: "bg-primary/10 text-primary",
  generation_failed: "bg-rose-100 text-rose-700",
  needs_review: "bg-amber-100 text-amber-800",
  ready_to_publish: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-sky-100 text-sky-800",
  live: "bg-[#1A4D2E]/10 text-[#1A4D2E]",
  completed: "bg-stone-200 text-stone-600",
  archived: "bg-stone-100 text-stone-500",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  // Schedule times are always shown in Nigerian local time (WAT, UTC+1).
  return parsed.toLocaleString(undefined, {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sectionProgress(exam: WeeklyExam): { generated: number; required: number } {
  return (exam.sections ?? []).reduce(
    (sum, section) => ({
      generated: sum.generated + (section.generated_count ?? 0),
      required: sum.required + (section.required_count ?? 0),
    }),
    { generated: 0, required: 0 },
  );
}

function readError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.details as { detail?: unknown } | undefined;
    const detail = body?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const record = detail as Record<string, unknown>;
      if (typeof record.message === "string" && record.message.trim()) return record.message;
      const missing = Array.isArray(record.missing) ? record.missing.map(String).join(", ") : "";
      const errors = Array.isArray(record.errors) ? record.errors.map(String).join("; ") : "";
      if (missing || errors) return [missing, errors].filter(Boolean).join(" ");
    }
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

function WeeklyCbtControlCenter() {
  const [exams, setExams] = useState<WeeklyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<WeeklyExam | null>(null);
  // One delete at a time: guards against repeated clicks while a request is in flight.
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [weekIdentifier, setWeekIdentifier] = useState("");
  const [duration, setDuration] = useState(120);
  const location = useLocation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await weeklyExamsApi.list();
      setExams(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(readError(err, "Could not load weekly examinations."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const stats = useMemo(() => {
    let live = 0;
    let scheduled = 0;
    let preparing = 0;
    let generated = 0;
    let required = 0;
    for (const exam of exams) {
      if (exam.status === "live") live += 1;
      else if (exam.status === "scheduled") scheduled += 1;
      else if (!["completed", "archived"].includes(exam.status)) preparing += 1;
      const progress = sectionProgress(exam);
      generated += progress.generated;
      required += progress.required;
    }
    return { live, scheduled, preparing, generated, required, total: exams.length };
  }, [exams]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const nextNumber = exams.length + 1;
      const exam = await weeklyExamsApi.create({
        title: title.trim() || `Weekly JAMB Examination ${nextNumber}`,
        week_identifier: weekIdentifier.trim() || undefined,
        description:
          "Weekly JAMB-style practice paper: each attempt is 180 questions — Use of English (60) + three registered electives (40 each) — assembled from the approved question pool.",
        duration_minutes: Number(duration) || 120,
        subject_counts: SUBJECT_COUNTS,
      });
      setTitle("");
      setWeekIdentifier("");
      setDuration(120);
      setShowCreate(false);
      setNotice(`Draft “${exam.title}” created. Opening the question-preparation workspace…`);
      await loadExams();
      await navigate({
        to: "/admin/cbt/$examId",
        params: { examId: exam.id },
      });
    } catch (err) {
      setError(readError(err, "Could not create the weekly examination."));
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(exam: WeeklyExam) {
    if (busyId) return;
    setBusyId(exam.id);
    setError("");
    setNotice("");
    const previous = exams;
    setExams((current) => current.map((item) => item.id === exam.id ? { ...item, status: "archived" } : item));
    try {
      const result = await weeklyExamsApi.archive(exam.id);
      setExams((current) => current.map((item) => item.id === exam.id ? { ...item, status: result.status as WeeklyExamStatus } : item));
      setNotice(`“${exam.title}” archived.`);
    } catch (err) {
      setExams(previous);
      setError(readError(err, "Could not archive this examination."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(exam: WeeklyExam) {
    if (busyId) return;
    setBusyId(exam.id);
    setError("");
    setNotice("");
    const previous = exams;
    setExams((current) => current.map((item) => item.id === exam.id ? { ...item, status: "draft" } : item));
    try {
      const result = await weeklyExamsApi.restore(exam.id);
      setExams((current) => current.map((item) => item.id === exam.id ? { ...item, status: result.status as WeeklyExamStatus } : item));
      setNotice(`“${exam.title}” restored.`);
    } catch (err) {
      setExams(previous);
      setError(readError(err, "Could not restore this examination."));
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Deletion failures are always translated to administrator-friendly copy —
   * raw backend messages (status names, codes) never reach the screen.
   */
  function deleteErrorMessage(err: unknown): string {
    const code = err instanceof ApiError ? err.code : undefined;
    const status = err instanceof ApiError ? err.statusCode : undefined;
    if (code === "exam_has_attempts") {
      return "This paper has student results, so it can’t be deleted. Archive it instead to keep the history safe.";
    }
    if (code === "exam_not_deletable") {
      return "This paper is live or completed, so it can’t be deleted. Archive it instead.";
    }
    if (status === 404) {
      return "This examination no longer exists — it may have already been deleted.";
    }
    if (status === 401 || status === 403) {
      return "You don’t have permission to delete examinations.";
    }
    if (code === "SERVICE_UNAVAILABLE" || code === "TIMEOUT" || err instanceof TypeError) {
      return "Could not reach the server. Check your connection and try again.";
    }
    return "This examination could not be deleted. Please try again.";
  }

  async function handleDelete(exam: WeeklyExam) {
    if (deleting) return;
    setDeleting(true);
    setError("");
    setNotice("");
    // Optimistic update: the card and every derived counter disappear at once.
    const previous = exams;
    setExams((current) => current.filter((item) => item.id !== exam.id));

    try {
      await weeklyExamsApi.remove(exam.id);
      setDeleteCandidate(null);
      setNotice(`“${exam.title}” deleted.`);
      // Stay in sync with the backend, but a failed refresh must never
      // resurrect a card whose deletion already succeeded.
      try {
        const refreshed = await weeklyExamsApi.list();
        if (Array.isArray(refreshed)) setExams(refreshed);
      } catch {
        /* keep the optimistic list */
      }
    } catch (err) {
      // Deletion failed: restore the card exactly as it was and explain why.
      setExams(previous);
      setDeleteCandidate(null);
      setError(deleteErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const isNestedExamRoute = path.startsWith("/admin/cbt/") && path !== "/admin/cbt";
  if (isNestedExamRoute) return <Outlet />;

  if (loading && exams.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-4" aria-busy="true" aria-live="polite">
        <div className="space-y-3">
          <div className="h-3 w-40 animate-pulse rounded-full bg-soft" />
          <div className="h-9 w-72 animate-pulse rounded-xl bg-soft" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-soft" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
        <p className="text-center text-sm text-muted">Loading weekly examinations…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Weekly CBT control center
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Examination pipeline</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Draft, generate with Gemini in controlled batches, review for uniqueness, then publish or
            schedule. Incomplete papers cannot be published, and the live paper keeps running while
            next week’s is prepared.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg shadow-sm"
        >
          <Plus className="size-4" /> New examination
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {deleteCandidate && (() => {
        const protectedExam = ["live", "completed", "archived"].includes(deleteCandidate.status);
        const statusLabel = STATUS_LABELS[deleteCandidate.status] ?? deleteCandidate.status;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-exam-title"
            onClick={() => {
              if (!deleting) setDeleteCandidate(null);
            }}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="delete-exam-title" className="font-display text-2xl text-ink">
                Delete examination?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Delete <strong className="text-ink">{deleteCandidate.title}</strong>?
              </p>
              <p className="mt-3 text-sm leading-relaxed text-rose-700">
                This will remove its examination configuration, schedule and associated generation
                jobs.
              </p>
              {protectedExam && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  This paper is {statusLabel.toLowerCase()} and holds student history, so it cannot
                  be deleted. Archive it instead to preserve results.
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="min-h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
                  onClick={() => setDeleteCandidate(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void handleDelete(deleteCandidate)}
                  disabled={deleting || protectedExam}
                >
                  {deleting && <Loader2 className="size-4 animate-spin" />}
                  {deleting ? "Deleting…" : "Delete examination"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-display text-2xl text-ink">Create a draft paper</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Weekly JAMB Examination"
                className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Week identifier
              <input
                value={weekIdentifier}
                onChange={(event) => setWeekIdentifier(event.target.value)}
                placeholder="2026-W46"
                className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Duration (minutes)
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="font-semibold uppercase tracking-[0.14em]">Master pool:</span>
            {Object.entries(SUBJECT_COUNTS).map(([subject, count]) => (
              <span key={subject} className="rounded-full border border-line bg-white px-2.5 py-1">
                {SUBJECT_LABELS[subject] ?? subject} {count}
              </span>
            ))}
            <span className="rounded-full border border-line bg-white px-2.5 py-1">Total 220</span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-60"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {creating ? "Creating…" : "Create draft"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Live paper" value={String(stats.live)} icon={<Gauge className="size-4" />} />
        <StatCard label="Scheduled" value={String(stats.scheduled)} icon={<CalendarClock className="size-4" />} />
        <StatCard label="In preparation" value={String(stats.preparing)} icon={<Sparkles className="size-4" />} />
        <StatCard
          label="Pool questions"
          value={`${stats.generated}/${stats.required}`}
          icon={<FileCheck2 className="size-4" />}
        />
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">Examinations</h2>
          <span className="rounded-full border border-line bg-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            {stats.total} papers
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
              No weekly examinations yet. Create the first draft to start the Gemini workflow.
            </div>
          ) : (
            exams.map((exam) => {
              const progress = sectionProgress(exam);
              const percent = progress.required
                ? Math.round((progress.generated / progress.required) * 100)
                : 0;
              const canArchive = exam.status === "live" || exam.status === "completed";

              return (
                <article
                  key={exam.id}
                  className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_BADGE[exam.status] ?? "bg-soft text-muted"}`}
                        >
                          {STATUS_LABELS[exam.status] ?? exam.status}
                        </span>
                        <h3 className="font-display text-xl text-ink">{exam.title}</h3>
                        {exam.week_identifier && (
                          <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
                            {exam.week_identifier}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                        <span>
                          Pool {progress.generated}/{progress.required} questions
                        </span>
                        <span>{exam.duration_minutes} mins</span>
                        <span>Opens {formatDate(exam.opening_at)}</span>
                        <span>Closes {formatDate(exam.closing_at)}</span>
                      </div>
                      <div className="mt-2 h-2 max-w-md rounded-full bg-soft">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const isCurrentWorkspace = location.pathname.startsWith(`/admin/cbt/${exam.id}`);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrentWorkspace) {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                                return;
                              }
                              void navigate({
                                to: "/admin/cbt/$examId",
                                params: { examId: exam.id },
                              });
                            }}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-95"
                            aria-current={isCurrentWorkspace ? "page" : undefined}
                          >
                            {isCurrentWorkspace ? "Reopen workspace" : "Open workspace"}
                            <ArrowRight className="size-3.5" />
                          </button>
                        );
                      })()}
                      {canArchive && (
                        <button
                          type="button"
                          onClick={() => void handleArchive(exam)}
                          disabled={busyId === exam.id}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-xs font-semibold text-ink disabled:opacity-50"
                        >
                          <Archive className="size-3.5" /> Archive
                        </button>
                      )}
                      {exam.status === "archived" && (
                        <button
                          type="button"
                          onClick={() => void handleRestore(exam)}
                          disabled={busyId === exam.id}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(exam)}
                        disabled={deleting}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2 text-muted">
        <span className="text-xs uppercase tracking-[0.15em]">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}
