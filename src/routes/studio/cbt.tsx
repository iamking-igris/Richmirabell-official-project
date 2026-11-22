import { createFileRoute, Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  Layers,
  Loader2,
  PenLine,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  Trophy,
} from "lucide-react";
import {
  assessmentsApi,
  weeklyExamsApi,
  type CbtHistoryItem,
  type StudentWeeklyExam,
} from "@/lib/backend";
import {
  formatDateTime,
  isCbtSubmitted,
  JAMB_PAPER_TOTAL,
  normalizeJambSubjects,
  percentage,
  subjectLabel,
} from "@/lib/cbt-utils";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/studio/cbt")({ component: CbtLayout });

function CbtLayout() {
  const matchWeekly = useMatch({ from: "/studio/cbt/weekly/$examId", shouldThrow: false });
  const matchJamb = useMatch({ from: "/studio/cbt/jamb", shouldThrow: false });

  if (matchWeekly || matchJamb) {
    return <Outlet />;
  }

  return <CbtPage />;
}

type CbtErrorInfo = {
  message: string;
  status?: number;
  code?: string;
  shortfall: string[];
};

function readCbtError(err: unknown, fallback: string): CbtErrorInfo {
  if (err instanceof ApiError) {
    const body = err.details as { detail?: unknown } | undefined;
    const detail = body?.detail;
    let message = err.message || fallback;
    const shortfall: string[] = [];

    if (typeof detail === "string" && detail.trim()) {
      message = detail;
    } else if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const record = detail as Record<string, unknown>;
      if (typeof record.message === "string" && record.message.trim()) message = record.message;
      if (Array.isArray(record.shortfall)) shortfall.push(...record.shortfall.map(String));
      else if (Array.isArray(record.missing)) shortfall.push(...record.missing.map(String));
    }

    return { message, status: err.statusCode, code: err.code, shortfall };
  }

  return {
    message: err instanceof Error ? err.message : fallback,
    shortfall: [],
  };
}

/** Backend business-rule codes → the heading shown to the student. */
function startErrorHeading(error: CbtErrorInfo): string {
  switch (error.code) {
    case "not_open":
      return "Not open yet";
    case "closed":
      return "Examination closed";
    case "not_live":
      return "Examination unavailable";
    case "insufficient_question_bank":
    case "section_unavailable":
    case "invalid_paper_assembly":
      return "Question bank not ready";
    case "invalid_subject_combination":
      return "Subject combination";
    case "examination_not_found":
      return "Examination not found";
    default:
      break;
  }
  if (error.status === 402) return "Subscription required";
  if (error.status === 401) return "Sign-in required";
  if (error.status === 408 || error.code === "TIMEOUT") return "Backend request timed out";
  return "Could not start paper";
}

type WeeklyCardAction = {
  label: string;
  icon: typeof Play;
  enabled: boolean;
};

/**
 * Description shown on an examination card.
 *
 * A student attempt is always 180 questions, so any stored wording that
 * counts the admin's 220-question pool as the paper is corrected before it
 * reaches a card. Everything else is shown exactly as saved.
 */
function paperDescription(description: string | null | undefined): string {
  const text = String(description ?? "").trim();
  if (!text) return "";
  if (/\b220\b/.test(text)) {
    return "180 questions per attempt: Use of English (60) + your three registered subjects (40 each).";
  }
  return text;
}

function weeklyAction(exam: StudentWeeklyExam): WeeklyCardAction {
  if (exam.visibility === "coming_soon") {
    return { label: "Not open yet", icon: Clock, enabled: false };
  }
  if (exam.visibility === "closed") {
    return { label: "Closed", icon: Clock, enabled: false };
  }
  if (exam.resumable) {
    return { label: "Resume examination", icon: Timer, enabled: true };
  }
  if (exam.retake_allowed && exam.attempt_id) {
    return { label: "Retake examination", icon: RotateCcw, enabled: true };
  }
  if (exam.can_start) {
    return { label: "Start examination", icon: Play, enabled: true };
  }
  return { label: exam.reason || "Unavailable", icon: Clock, enabled: false };
}

function attemptBadge(exam: StudentWeeklyExam): { text: string; className: string } {
  if (exam.resumable) {
    return { text: "In progress", className: "bg-amber-100 text-amber-900" };
  }
  if (exam.attempt_id) {
    return {
      text: exam.attempts_taken > 1 ? `${exam.attempts_taken} attempts` : "Attempted",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  return { text: "Not attempted", className: "bg-stone-200 text-stone-600" };
}

function CbtPage() {
  const navigate = useNavigate();
  const jambSubjects = useSession((s) => s.jambSubjects);

  const [history, setHistory] = useState<CbtHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<CbtErrorInfo | null>(null);
  const [weeklyExams, setWeeklyExams] = useState<StudentWeeklyExam[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<CbtErrorInfo | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<CbtErrorInfo | null>(null);

  const optionalSubjects = useMemo(() => normalizeJambSubjects(jambSubjects), [jambSubjects]);
  const combinationValid = optionalSubjects.length === 3;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const items = await assessmentsApi.cbtHistory();
      setHistory(Array.isArray(items) ? items : []);
    } catch (err) {
      setHistoryError(readCbtError(err, "Could not load your CBT history from the backend."));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadWeeklyExams = useCallback(async () => {
    setWeeklyLoading(true);
    setWeeklyError(null);
    try {
      // Visibility (live / coming soon / closed) and the student's attempt
      // state are computed by the backend from server time — the browser
      // never decides what is open.
      const payload = await weeklyExamsApi.discover();
      setWeeklyExams(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setWeeklyExams([]);
      setWeeklyError(readCbtError(err, "Could not load examinations from the backend."));
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void loadWeeklyExams();
  }, [loadHistory, loadWeeklyExams]);

  const sortedHistory = useMemo(() => {
    const stamp = (item: CbtHistoryItem) =>
      Date.parse(item.submitted_at ?? item.started_at ?? "") || 0;
    return [...history].sort((a, b) => stamp(b) - stamp(a));
  }, [history]);

  const completed = useMemo(
    () =>
      sortedHistory.filter(
        (item) => Boolean(item.submitted_at) || isCbtSubmitted(item.status),
      ),
    [sortedHistory],
  );

  const stats = useMemo(() => {
    let scored = 0;
    let possible = 0;
    let best: CbtHistoryItem | null = null;

    for (const item of completed) {
      scored += item.score;
      possible += item.total;
      if (!best || percentage(item.score, item.total) > percentage(best.score, best.total)) {
        best = item;
      }
    }

    return {
      attempts: completed.length,
      accuracy: percentage(scored, possible),
      best,
    };
  }, [completed]);

  /* ---------------------------------------------------------------- */
  /* Unified hub sections (backend-driven)                             */
  /* ---------------------------------------------------------------- */
  const availableExams = useMemo(
    () => weeklyExams.filter((exam) => exam.visibility === "live"),
    [weeklyExams],
  );
  const upcomingExams = useMemo(
    () => weeklyExams.filter((exam) => exam.visibility === "coming_soon"),
    [weeklyExams],
  );
  // Closed papers are never listed as available: their attempts live on in
  // Examination History below (closing never deletes a result).
  async function startWeeklyExamination(exam: StudentWeeklyExam) {
    if (startingId) return;
    setStartingId(exam.id);
    setStartError(null);
    try {
      // Backend assembles the personalised 180-question paper and returns the
      // attempt id. startAttemptSafely recovers from timeouts by resuming the
      // attempt the backend already created instead of duplicating it.
      const attempt = await weeklyExamsApi.startAttemptSafely(exam.id);
      navigate({
        to: "/studio/cbt/weekly/$examId",
        params: { examId: attempt.attempt_id },
      });
    } catch (err) {
      setStartError(readCbtError(err, "Could not start the examination."));
      void loadWeeklyExams();
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2 font-sans">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1A4D2E]">
              <Trophy className="size-3.5" /> JAMB CBT Practice
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold text-stone-900">Examination Hub</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">
              Your Weekly CBT is here! Challenge yourself with 180 questions across Use of English
              and your three registered subjects. You have 120 minutes to complete each attempt.
              Take the exam, track your performance, and keep improving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadHistory();
              void loadWeeklyExams();
            }}
            disabled={historyLoading || weeklyLoading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-3.5", (historyLoading || weeklyLoading) && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </header>

      {startError && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-xs",
            startError.status === 409
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-rose-200 bg-rose-50 text-rose-950",
          )}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-bold">{startErrorHeading(startError)}</p>
              <p className="leading-relaxed">{startError.message}</p>

              {startError.shortfall.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {startError.shortfall.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-amber-300 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-amber-900"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {startError.status === 402 && (
                <Link to="/studio/plan" className="inline-flex font-bold underline">
                  View subscription plans →
                </Link>
              )}
              {startError.status === 401 && (
                <Link to="/login" className="inline-flex font-bold underline">
                  Sign in again →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Available examinations                                          */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <Play className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">
              Available examinations
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            {weeklyLoading
              ? "Loading…"
              : `${availableExams.length} open ${availableExams.length === 1 ? "paper" : "papers"}`}
          </span>
        </div>

        {weeklyLoading ? (
          <div className="space-y-3">
            {[0, 1].map((key) => (
              <div key={key} className="h-32 animate-pulse rounded-3xl border border-stone-200 bg-stone-100" />
            ))}
          </div>
        ) : weeklyError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p className="font-bold">Could not load examinations</p>
                <p>{weeklyError.message}</p>
                <button
                  type="button"
                  onClick={() => void loadWeeklyExams()}
                  className="font-bold underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : availableExams.length === 0 && upcomingExams.length === 0 ? (
          /* Empty state — same hub, no broken cards or dead buttons */
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
            <Clock className="mx-auto size-10 text-stone-400 opacity-60" />
            <h3 className="mt-3 font-serif text-base font-bold text-stone-800">
              No examinations available
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-stone-600">
              There are currently no examinations available. Check back when a new examination is
              published.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableExams.map((exam) => {
              const action = weeklyAction(exam);
              const badge = attemptBadge(exam);
              const window = [exam.opening_at, exam.closing_at]
                .filter(Boolean)
                .map((value) => formatDateTime(String(value)))
                .join(" → ");
              const starting = startingId === exam.id;
              const Icon = action.icon;

              return (
                <article
                  key={exam.id}
                  className="rounded-3xl border border-stone-200 bg-[#F4F7F2] p-5 shadow-xs sm:p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1A4D2E]">
                          <Layers className="size-3" /> Weekly CBT
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            badge.className,
                          )}
                        >
                          {badge.text}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          <Clock className="size-3" /> Open now
                        </span>
                      </div>
                      <h3 className="mt-2 font-serif text-xl font-bold text-stone-900 sm:text-2xl">
                        {exam.title}
                      </h3>
                      <p className="mt-1 max-w-xl text-sm text-stone-600">
                        {paperDescription(exam.description)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="font-bold text-stone-700">
                          {exam.total_questions || JAMB_PAPER_TOTAL} questions
                        </span>
                        <span>English 60 + 3 electives × 40</span>
                        <span>{exam.duration_minutes} minutes</span>
                        {window && <span>{window}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startWeeklyExamination(exam)}
                      disabled={!action.enabled || Boolean(startingId)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-5 text-xs font-bold text-white hover:bg-[#153e25] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {starting ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                      {starting ? "Preparing paper…" : action.label}
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Upcoming papers sit inside the same hub, never startable early */}
            {upcomingExams.map((exam) => {
              const badge = attemptBadge(exam);
              const window = [exam.opening_at, exam.closing_at]
                .filter(Boolean)
                .map((value) => formatDateTime(String(value)))
                .join(" → ");

              return (
                <article
                  key={exam.id}
                  className="rounded-3xl border border-dashed border-stone-300 bg-white p-5 shadow-xs sm:p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                          <Clock className="size-3" /> Weekly CBT · Upcoming
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            badge.className,
                          )}
                        >
                          {badge.text}
                        </span>
                      </div>
                      <h3 className="mt-2 font-serif text-xl font-bold text-stone-900">
                        {exam.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span>
                          Opens {exam.opening_at ? formatDateTime(exam.opening_at) : "soon"}
                        </span>
                        {exam.closing_at && <span>Closes {formatDateTime(exam.closing_at)}</span>}
                        <span>{exam.total_questions || JAMB_PAPER_TOTAL} questions</span>
                        <span>{exam.duration_minutes} minutes</span>
                      </div>
                      {window && <p className="mt-1 text-[11px] text-stone-500">{window}</p>}
                    </div>
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-200 bg-stone-100 px-5 text-xs font-bold text-stone-500">
                      <Clock className="size-4" /> Upcoming
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Candidate combination (informational — no second start button) */}
      <section className="rounded-3xl border border-stone-200 bg-[#FCFAF7] p-5 shadow-xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  combinationValid ? "bg-[#1A4D2E]" : "bg-amber-500",
                )}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                Your candidate combination
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              <span className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-2xs">
                <span className="size-1.5 rounded-full bg-[#1A4D2E]" />
                Use of English (Compulsory)
              </span>
              {optionalSubjects.map((subject) => (
                <span
                  key={subject}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-[#1A4D2E]" />
                  {subjectLabel(subject)}
                </span>
              ))}
            </div>

            <p className="text-[11px] leading-relaxed text-stone-500">
              {combinationValid
                ? `4 subjects · ${JAMB_PAPER_TOTAL} objective questions · backend-timed paper`
                : "Select exactly 3 optional subjects in your profile before starting a paper."}
            </p>
          </div>

          <Link
            to="/studio/profile"
            className="shrink-0 rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-center text-xs font-bold text-[#1A4D2E] hover:underline"
          >
            {combinationValid ? "Change electives" : "Fix subject combination"}
          </Link>
        </div>

        {!combinationValid && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Your combination is incomplete.</p>
              <p>
                You currently have {optionalSubjects.length} valid optional subject
                {optionalSubjects.length === 1 ? "" : "s"}. Choose exactly 3 from Mathematics, Physics,
                Chemistry, and Biology.
              </p>
              <Link to="/studio/profile" className="font-bold underline">
                Update your profile →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Performance summary */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">My performance</h2>
          </div>
          <span className="text-xs text-stone-500">
            {stats.attempts} completed {stats.attempts === 1 ? "paper" : "papers"}
          </span>
        </div>

        {historyLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
            ))}
          </div>
        ) : stats.attempts === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
            <Trophy className="mx-auto size-10 text-stone-400 opacity-60" />
            <h3 className="mt-2 font-serif text-base font-bold text-stone-800">No completed papers yet</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-stone-600">
              Finish a CBT paper to see your backend-scored results and subject breakdown here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Completed papers
              </span>
              <strong className="font-serif text-2xl font-bold text-stone-900">{stats.attempts}</strong>
              <span className="block text-[11px] text-stone-500">Saved by the backend</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Overall accuracy
              </span>
              <strong className="font-serif text-2xl font-bold text-emerald-800">{stats.accuracy}%</strong>
              <span className="block text-[11px] text-emerald-700">Across all completed papers</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Best paper
              </span>
              <strong className="font-serif text-2xl font-bold text-[#1A4D2E]">
                {stats.best ? `${stats.best.score}/${stats.best.total}` : "—"}
              </strong>
              <span className="block text-[11px] text-stone-500">
                {stats.best ? `${percentage(stats.best.score, stats.best.total)}%` : "No result"}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Examination history */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <History className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">
              Examination history
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            {sortedHistory.length} {sortedHistory.length === 1 ? "record" : "records"}
          </span>
        </div>

        {historyLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-28 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
            ))}
          </div>
        ) : historyError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p className="font-bold">Could not load CBT history</p>
                <p>{historyError.message}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void loadHistory()}
                    className="font-bold underline"
                  >
                    Try again
                  </button>
                  {historyError.status === 401 && (
                    <Link to="/login" className="font-bold underline">
                      Sign in again →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : sortedHistory.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
            <History className="mx-auto size-8 text-stone-400 opacity-60" />
            <h3 className="mt-2 font-serif text-base font-bold text-stone-800">
              No CBT attempts recorded
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-600">
              Start an examination above. In-progress and submitted attempts returned by the backend
              will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map((item) => {
              const submitted = Boolean(item.submitted_at) || isCbtSubmitted(item.status);
              const subjectScores = Object.entries(item.subject_scores ?? {});
              const pct = percentage(item.score, item.total);
              const isWeekly = Boolean(item.weekly_examination_id);

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs transition-colors hover:border-stone-300"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            submitted
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {item.status === "TIMED_OUT"
                            ? "Timed out"
                            : submitted
                              ? "Submitted"
                              : "In progress"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A4D2E]">
                          <Layers className="size-3.5" />
                          {isWeekly ? "Weekly CBT" : "Full JAMB CBT"}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {formatDateTime(item.submitted_at ?? item.started_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="font-serif text-lg font-bold text-stone-900">
                          {item.title ||
                            (submitted ? `${item.score} / ${item.total}` : "Paper not yet submitted")}
                        </h3>
                        {submitted && (
                          <>
                            <span className="font-mono text-sm font-bold text-stone-700">
                              {item.score} / {item.total}
                            </span>
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                              {pct}%
                            </span>
                          </>
                        )}
                      </div>

                      {subjectScores.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {subjectScores.map(([subject, score]) => (
                            <span
                              key={subject}
                              className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-700"
                            >
                              <strong className="font-semibold text-stone-900">
                                {subjectLabel(subject)}
                              </strong>{" "}
                              <span className="font-mono">
                                {score.score}/{score.total}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {submitted && (
                        <Link
                          to="/studio/performance/$attemptId"
                          params={{ attemptId: item.id }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-800 hover:bg-stone-50"
                        >
                          <BarChart3 className="size-3.5" /> Review performance
                        </Link>
                      )}
                      <Link
                        to="/studio/cbt/weekly/$examId"
                        params={{ examId: item.id }}
                        className={cn(
                          "inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold transition-colors",
                          submitted
                            ? "border border-stone-300 bg-white text-stone-900 hover:bg-stone-50"
                            : "bg-[#1A4D2E] text-white hover:bg-[#153e25]",
                        )}
                      >
                        {submitted ? (
                          <>
                            <CheckCircle2 className="size-3.5" /> View result
                          </>
                        ) : (
                          <>
                            <Timer className="size-3.5" /> Resume paper
                          </>
                        )}
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-stone-50/70 p-5 text-xs leading-relaxed text-stone-600">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 size-4 text-[#1A4D2E]" />
          <p>
            Practice with topic quizzes built from the published question bank while your
            JAMB CBT bank grows.
          </p>
        </div>
      </section>
    </div>
  );
}
