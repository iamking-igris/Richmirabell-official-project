import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Grid,
  Layers,
  Loader2,
  PenLine,
  RefreshCw,
  Timer,
  Trophy,
  User,
  X,
} from "lucide-react";
import type { Choice } from "@/data/catalog";
import {
  assessmentsApi,
  type CbtExamResponse,
  type CbtHistoryItem,
  type CbtSubmitResponse,
} from "@/lib/backend";
import {
  buildCbtSections,
  cbtElapsedSeconds,
  flattenCbtSections,
  formatClock,
  isCbtSubmitted,
  normalizeAnswerMap,
  percentage,
  resolveCbtDeadlineMs,
  subjectLabel,
  type CbtQuestionView,
} from "@/lib/cbt-utils";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { ApiError } from "@/services/api/errors";

interface JambExamHallProps {
  examId: string;
  examType: "weekly_jamb" | "full_jamb_mock";
  titleOverride?: string;
  backRoute?: "/studio/cbt";
}

type CbtErrorInfo = {
  message: string;
  status?: number;
  code?: string;
};

type CbtResultView = {
  score: number | null;
  total: number | null;
  status: string;
  subjectScores: Record<string, { score: number; total: number }>;
  timedOut: boolean;
  source: "submit" | "history" | "exam";
};

function readCbtError(err: unknown, fallback: string): CbtErrorInfo {
  if (err instanceof ApiError) {
    const body = err.details as { detail?: unknown } | undefined;
    const detail = body?.detail;
    let message = err.message || fallback;

    if (typeof detail === "string" && detail.trim()) {
      message = detail;
    } else if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const record = detail as Record<string, unknown>;
      if (typeof record.message === "string" && record.message.trim()) message = record.message;
    }

    return { message, status: err.statusCode, code: err.code };
  }
  return { message: err instanceof Error ? err.message : fallback };
}

function resultFromSubmit(response: CbtSubmitResponse): CbtResultView {
  return {
    score: response.score,
    total: response.total,
    status: response.status,
    subjectScores: response.subject_scores ?? {},
    timedOut: Boolean(response.timed_out),
    source: "submit",
  };
}

function resultFromHistory(item: CbtHistoryItem | null): CbtResultView | null {
  if (!item) return null;
  return {
    score: item.score,
    total: item.total,
    status: item.status,
    subjectScores: item.subject_scores ?? {},
    timedOut: false,
    source: "history",
  };
}

function resultFromExam(exam: CbtExamResponse): CbtResultView | null {
  const raw = exam as unknown as Record<string, unknown>;
  const score = typeof raw.score === "number" ? raw.score : null;
  if (score === null) return null;
  const total = typeof raw.total === "number" ? raw.total : null;
  const subjectScores =
    raw.subject_scores && typeof raw.subject_scores === "object"
      ? (raw.subject_scores as Record<string, { score: number; total: number }>)
      : {};
  return {
    score,
    total,
    status: exam.status,
    subjectScores,
    timedOut: Boolean(raw.timed_out),
    source: "exam",
  };
}

function isSubmittedExam(exam: CbtExamResponse, historyItem: CbtHistoryItem | null): boolean {
  if (isCbtSubmitted(exam.status)) return true;
  if (!historyItem) return false;
  return Boolean(historyItem.submitted_at) || isCbtSubmitted(historyItem.status);
}

export function JambExamHall({
  examId,
  examType,
  titleOverride,
  backRoute = "/studio/cbt",
}: JambExamHallProps) {
  const studentName = useSession((s) => s.name);
  const studentEmail = useSession((s) => s.email);
  const refreshProgress = useSession((s) => s.refreshProgress);

  const [exam, setExam] = useState<CbtExamResponse | null>(null);
  const [historyItem, setHistoryItem] = useState<CbtHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<CbtErrorInfo | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<CbtResultView | null>(null);
  const [picks, setPicks] = useState<Record<string, Choice>>({});
  const [index, setIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [paletteView, setPaletteView] = useState<"section" | "all">("section");
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const [left, setLeft] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<CbtErrorInfo | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const picksRef = useRef<Record<string, Choice>>({});
  const submittingRef = useRef(false);
  const autoSubmitRef = useRef(false);

  const candidateName = studentName || (studentEmail ? studentEmail.split("@")[0] : "Candidate");

  useEffect(() => {
    picksRef.current = picks;
  }, [picks]);

  const sections = useMemo(() => buildCbtSections(exam?.sections), [exam]);
  const questions = useMemo(() => flattenCbtSections(sections), [sections]);

  const sectionStarts = useMemo(() => {
    let cursor = 0;
    return sections.map((section) => {
      const start = cursor;
      cursor += section.questions.length;
      return start;
    });
  }, [sections]);

  const currentSectionIndex = useMemo(() => {
    if (sections.length === 0) return 0;
    let cursor = 0;
    for (let i = 0; i < sections.length; i += 1) {
      const length = sections[i].questions.length;
      if (index < cursor + length) return i;
      cursor += length;
    }
    return sections.length - 1;
  }, [sections, index]);

  const currentSection = sections[currentSectionIndex] ?? null;
  const currentQuestion = questions[index] ?? null;
  const deadlineMs = exam ? resolveCbtDeadlineMs(exam) : null;

  /* ---------------------------------------------------------------- */
  /* Load the exam and the matching history record                     */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setSubmitted(false);
    setResult(null);
    setPicks({});
    setIndex(0);
    setFlagged(new Set());
    setTimeExpired(false);
    setSubmitError(null);
    setSaveState("idle");
    autoSubmitRef.current = false;

    (async () => {
      const historyPromise = assessmentsApi.cbtHistory().catch(() => null);

      try {
        const examData = await assessmentsApi.getCbt(examId);
        const history = await historyPromise;
        if (cancelled) return;

        const item = history?.find((entry) => entry.id === examId) ?? null;
        setExam(examData);
        setHistoryItem(item);

        if (isSubmittedExam(examData, item)) {
          setSubmitted(true);
          setResult(resultFromHistory(item) ?? resultFromExam(examData));
        } else {
          setPicks(normalizeAnswerMap(examData.answers));
        }
      } catch (err) {
        const history = await historyPromise;
        if (cancelled) return;
        const item = history?.find((entry) => entry.id === examId) ?? null;

        if (item && (Boolean(item.submitted_at) || isCbtSubmitted(item.status))) {
          setHistoryItem(item);
          setSubmitted(true);
          setResult(resultFromHistory(item));
        } else {
          setLoadError(readCbtError(err, "Could not load this examination from the backend."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [examId, reloadToken]);

  /* ---------------------------------------------------------------- */
  /* Clamp the active question when the paper changes                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (questions.length === 0) return;
    if (index >= questions.length) setIndex(questions.length - 1);
  }, [questions.length, index]);

  /* ---------------------------------------------------------------- */
  /* Debounced answer autosave                                         */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!exam || submitted || timeExpired) return;

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      assessmentsApi
        .saveCbtAnswers(examId, picks, cbtElapsedSeconds(exam.started_at))
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 900);

    return () => window.clearTimeout(timer);
  }, [picks, exam, submitted, timeExpired, examId]);

  /* ---------------------------------------------------------------- */
  /* Submission                                                        */
  /* ---------------------------------------------------------------- */
  const submitExam = useCallback(
    async (automatic: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);

      try {
        const response = await assessmentsApi.submitCbt(examId, picksRef.current, {});
        setResult(resultFromSubmit(response));
        setSubmitted(true);
        setSubmitConfirmOpen(false);
        setTimeExpired(false);
        setSaveState("idle");
        void refreshProgress();
      } catch (err) {
        setSubmitError(
          readCbtError(
            err,
            automatic
              ? "Time is up, but the automatic submission failed. Please retry."
              : "Could not submit the paper.",
          ),
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [examId, refreshProgress],
  );

  /* ---------------------------------------------------------------- */
  /* Deadline countdown + automatic submission                         */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!exam || submitted || deadlineMs === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setLeft(remaining);

      if (remaining <= 0) {
        setTimeExpired(true);
        if (!autoSubmitRef.current) {
          autoSubmitRef.current = true;
          void submitExam(true);
        }
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [exam, submitted, deadlineMs, submitExam]);

  const answeredCount = Object.keys(picks).length;

  const goToSection = (sectionIndex: number) => {
    const start = sectionStarts[sectionIndex];
    if (typeof start === "number") {
      setIndex(start);
      setMobilePaletteOpen(false);
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /* Loading / error states                                            */
  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-24 text-center font-sans">
        <Loader2 className="size-8 animate-spin text-[#1A4D2E]" />
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Loading examination</h1>
          <p className="mt-1 text-sm text-stone-600">
            Fetching your paper, saved answers, and deadline from the backend.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-10 font-sans">
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E]">
          <ArrowLeft className="size-4" /> Back to CBT Hub
        </Link>

        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-950 sm:p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="space-y-3">
              <div>
                <h1 className="font-serif text-2xl font-bold">
                  {loadError.status === 404
                    ? "Examination not found"
                    : loadError.status === 402
                      ? "Subscription required"
                      : loadError.status === 401
                        ? "Sign-in required"
                        : "Could not load examination"}
                </h1>
                <p className="mt-1 text-sm leading-relaxed">{loadError.message}</p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReloadToken((token) => token + 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-4 py-2 text-rose-900 hover:bg-rose-100"
                >
                  <RefreshCw className="size-3.5" /> Try again
                </button>
                {loadError.status === 402 && (
                  <Link to="/studio/plan" className="rounded-full bg-rose-900 px-4 py-2 text-white">
                    View subscription plans →
                  </Link>
                )}
                {loadError.status === 401 && (
                  <Link to="/login" className="rounded-full bg-rose-900 px-4 py-2 text-white">
                    Sign in again →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Submitted / result state                                          */
  /* ---------------------------------------------------------------- */
  if (submitted) {
    const score = result?.score ?? null;
    const total = result?.total ?? null;
    const hasScore = typeof score === "number" && typeof total === "number";
    const pct = hasScore ? percentage(score, total) : null;
    const subjectEntries = Object.entries(result?.subjectScores ?? {});

    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8 font-sans">
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E]">
          <ArrowLeft className="size-4" /> Back to CBT Hub
        </Link>

        <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-xs sm:p-9">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-[#1A4D2E] shadow-2xs">
            <CheckCircle2 className="size-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A4D2E]">
              Examination submitted
            </span>
            <h1 className="font-serif text-4xl font-bold text-stone-900 sm:text-5xl">
              {hasScore ? `${score} / ${total}` : "Result recorded"}
            </h1>
            <p className="text-sm font-semibold text-stone-700">
              {pct === null ? "The backend has recorded this submission." : `${pct}% overall`}
            </p>
            <p className="mx-auto max-w-md pt-1 text-xs leading-relaxed text-stone-500">
              {titleOverride || "JAMB CBT Examination"} ·{" "}
              {historyItem?.submitted_at
                ? `Submitted ${new Date(historyItem.submitted_at).toLocaleString("en-NG")}`
                : "Saved by the backend"}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {result?.timedOut && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900">
                <Timer className="size-3.5" /> Submitted automatically at the deadline
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-700">
              <Layers className="size-3.5" /> Status: {result?.status ?? "submitted"}
            </span>
          </div>

          {subjectEntries.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white text-left text-xs shadow-2xs">
              <div className="border-b border-stone-200 bg-stone-50 p-3 text-[10px] font-bold uppercase tracking-wider text-stone-800">
                Per-subject score
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-stone-100 bg-stone-50/50 text-[10px] font-bold uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2 text-right">Correct</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {subjectEntries.map(([subject, scoreRow]) => (
                    <tr key={subject}>
                      <td className="px-4 py-2.5 font-bold text-stone-900">{subjectLabel(subject)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-stone-800">
                        {scoreRow.score}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-stone-500">
                        {scoreRow.total}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold font-mono text-[#1A4D2E]">
                        {percentage(scoreRow.score, scoreRow.total)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subjectEntries.length === 0 && (
            <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-600">
              {hasScore
                ? "This record does not include a per-subject breakdown."
                : "The backend did not include score details with this examination record."}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/studio/performance/$attemptId"
              params={{ attemptId: examId }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#1A4D2E] bg-white px-6 text-xs font-bold text-[#1A4D2E] hover:bg-[#1A4D2E]/5"
            >
              <BarChart3 className="size-4" /> Review my performance
            </Link>
            <Link
              to="/studio/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300 bg-white px-6 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              Back to CBT Hub
            </Link>
            <Link
              to="/studio/progress"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-7 text-xs font-bold text-white shadow-xs hover:bg-[#153e25]"
            >
              <Trophy className="size-4" /> View progress
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Empty paper                                                       */
  /* ---------------------------------------------------------------- */
  if (!exam || questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-10 font-sans">
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E]">
          <ArrowLeft className="size-4" /> Back to CBT Hub
        </Link>
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
          <BookOpen className="mx-auto size-9 text-stone-400 opacity-60" />
          <h1 className="mt-3 font-serif text-2xl font-bold text-stone-900">No questions returned</h1>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-600">
            The backend returned this examination without any questions. Nothing has been generated
            locally to fill the gap.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#153e25]"
          >
            <RefreshCw className="size-3.5" /> Reload paper
          </button>
        </div>
      </div>
    );
  }

  const questionNumberInSection = index - (sectionStarts[currentSectionIndex] ?? 0) + 1;
  const sectionLength = currentSection?.questions.length ?? 0;
  const paletteIndexes =
    paletteView === "section" && currentSection
      ? Array.from(
          { length: currentSection.questions.length },
          (_, offset) => (sectionStarts[currentSectionIndex] ?? 0) + offset,
        )
      : questions.map((_, questionIndex) => questionIndex);

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-12 font-sans">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={backRoute}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#1A4D2E] text-white shadow-2xs"
            aria-label="Back to CBT Hub"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-serif text-sm font-bold leading-none text-stone-900 sm:text-base">
                {titleOverride || "JAMB CBT Examination"}
              </h1>
              <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 sm:inline-block">
                {examType === "full_jamb_mock" ? "Full mock" : "CBT"}
              </span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-1">
                <User className="size-3" /> {candidateName}
              </span>
              <span>·</span>
              <span>
                {questions.length} questions · {exam.duration_minutes} minutes
              </span>
              <span>·</span>
              <span
                className={cn(
                  "font-semibold",
                  saveState === "error" ? "text-rose-600" : "text-stone-500",
                )}
              >
                {saveState === "saving"
                  ? "Saving answers…"
                  : saveState === "saved"
                    ? "Answers saved"
                    : saveState === "error"
                      ? "Could not save answers"
                      : "Autosave on"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 font-mono text-xs font-bold transition-all sm:text-sm",
              deadlineMs === null
                ? "border-stone-200 bg-stone-100 text-stone-600"
                : left < 300
                  ? "animate-pulse border-rose-300 bg-rose-100 text-rose-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950",
            )}
            title={deadlineMs === null ? "The backend did not return a deadline" : "Time remaining"}
          >
            <Clock className={cn("size-4", left < 300 ? "text-rose-600" : "text-emerald-700")} />
            <span>{deadlineMs === null ? "--:--" : formatClock(left)}</span>
          </div>

          <button
            type="button"
            onClick={() => setMobilePaletteOpen((open) => !open)}
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs font-bold text-stone-700 lg:hidden"
          >
            <Grid className="size-4 text-[#1A4D2E]" />
            <span className="hidden xs:inline">Palette</span>
          </button>

          <button
            type="button"
            onClick={() => setSubmitConfirmOpen(true)}
            disabled={submitting}
            className="rounded-xl bg-[#1A4D2E] px-4 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#153e25] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit paper"}
          </button>
        </div>
      </header>

      {deadlineMs === null && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            The backend did not return a valid deadline for this paper. The timer is unavailable, but
            you can still save answers and submit manually.
          </p>
        </div>
      )}

      {submitError && !timeExpired && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Submission failed</p>
            <p>{submitError.message}</p>
            <button
              type="button"
              onClick={() => void submitExam(false)}
              className="font-bold underline"
            >
              Retry submission →
            </button>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex shrink-0 items-center gap-2">
          {sections.map((section, sectionIndex) => {
            const answered = section.questions.filter((question) => picks[question.id]).length;
            const active = sectionIndex === currentSectionIndex;
            return (
              <button
                key={`${section.subject}-${sectionIndex}`}
                type="button"
                onClick={() => goToSection(sectionIndex)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold shadow-2xs transition-all",
                  active
                    ? "border-[#1A4D2E] bg-[#1A4D2E] text-white"
                    : "border-stone-200 bg-white text-stone-800 hover:border-stone-400",
                )}
              >
                <span>{section.label}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px]",
                    active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600",
                  )}
                >
                  {answered}/{section.questions.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-xs text-stone-500 sm:flex">
          <span>Total answered:</span>
          <strong className="rounded-lg border border-stone-200 bg-stone-100 px-2 py-0.5 font-mono text-stone-900">
            {answeredCount} / {questions.length}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <main className="space-y-4 lg:col-span-8">
          <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1A4D2E]">
                    {currentQuestion?.subjectLabel ?? subjectLabel(currentSection?.subject)} section
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs text-stone-500">
                    Question {questionNumberInSection} of {sectionLength}
                  </span>
                </div>
                <h2 className="font-mono text-sm font-bold text-stone-900">
                  Overall question {index + 1} of {questions.length}
                </h2>
              </div>

              {currentQuestion && (
                <button
                  type="button"
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                    flagged.has(currentQuestion.id)
                      ? "border-amber-300 bg-amber-100 text-amber-900 shadow-2xs"
                      : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100",
                  )}
                >
                  <Flag
                    className={cn(
                      "size-3.5",
                      flagged.has(currentQuestion.id) && "fill-amber-600 text-amber-600",
                    )}
                  />
                  <span>{flagged.has(currentQuestion.id) ? "Flagged" : "Flag question"}</span>
                </button>
              )}
            </div>

            {currentQuestion ? (
              <>
                <div className="pt-1 font-serif text-base leading-relaxed text-stone-900 sm:text-lg">
                  {currentQuestion.prompt ? (
                    <InlineMathText text={currentQuestion.prompt} />
                  ) : (
                    <span className="text-stone-500">This question has no prompt text.</span>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {currentQuestion.options.length > 0 ? (
                    currentQuestion.options.map((option) => {
                      const selected = picks[currentQuestion.id] === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() =>
                            setPicks((current) => ({ ...current, [currentQuestion.id]: option.key }))
                          }
                          className={cn(
                            "group flex min-h-14 w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all",
                            selected
                              ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow-xs"
                              : "border-stone-200 bg-stone-50/60 text-stone-800 hover:border-stone-300 hover:bg-stone-100/80",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors",
                              selected
                                ? "border-white/40 bg-white/20 text-white"
                                : "border-stone-200 bg-white text-stone-700 group-hover:border-stone-400",
                            )}
                          >
                            {option.key}
                          </span>
                          <span className="flex-1 leading-snug">
                            <InlineMathText text={option.text} />
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                      The backend did not return answer options for this question. It has not been
                      replaced with a local question.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setIndex((current) => Math.max(0, current - 1))}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-stone-200 px-5 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </button>

                  {index < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#153e25] sm:px-7"
                    >
                      Next question <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubmitConfirmOpen(true)}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#153e25] sm:px-7"
                    >
                      Submit final paper <CheckCircle2 className="size-4" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-stone-600">No question at this position.</p>
            )}
          </div>
        </main>

        <aside
          className={cn(
            "space-y-4 transition-all lg:col-span-4",
            mobilePaletteOpen
              ? "fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-stone-300 bg-white p-4 shadow-2xl"
              : "hidden lg:block",
          )}
        >
          <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="size-4 text-[#1A4D2E]" />
                <h3 className="font-serif text-sm font-bold text-stone-900">Question palette</h3>
              </div>
              {mobilePaletteOpen && (
                <button
                  type="button"
                  onClick={() => setMobilePaletteOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-700"
                  aria-label="Close palette"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaletteView("section")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-center transition-all",
                  paletteView === "section"
                    ? "bg-white font-bold text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                {currentSection?.label ?? "Section"} ({currentSection?.questions.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setPaletteView("all")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-center transition-all",
                  paletteView === "all"
                    ? "bg-white font-bold text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                All {questions.length} questions
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 border-b border-stone-100 pb-3 text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-[#1A4D2E]" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md border border-stone-300 bg-stone-100" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md border border-amber-400 bg-amber-100" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-[#1A4D2E] ring-2 ring-amber-400" />
                <span>Answered & flagged</span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5">
                {paletteIndexes.map((questionIndex) => {
                  const question = questions[questionIndex];
                  if (!question) return null;
                  const isCurrent = questionIndex === index;
                  const isAnswered = Boolean(picks[question.id]);
                  const isFlagged = flagged.has(question.id);

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => {
                        setIndex(questionIndex);
                        setMobilePaletteOpen(false);
                      }}
                      className={cn(
                        "relative flex size-8 items-center justify-center rounded-xl font-mono text-xs font-bold transition-all",
                        isCurrent && "z-10 scale-105 ring-2 ring-stone-900 ring-offset-1",
                        isAnswered
                          ? "bg-[#1A4D2E] text-white shadow-2xs"
                          : "border border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-400 hover:text-stone-900",
                        isFlagged && "ring-2 ring-amber-500",
                      )}
                    >
                      <span>{questionIndex + 1}</span>
                      {isFlagged && (
                        <span className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500 ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Time expired overlay */}
      {timeExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Timer className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-bold text-stone-900">Time is up</h3>
              <p className="text-xs leading-relaxed text-stone-600">
                {submitting
                  ? "Submitting your saved answers to the backend…"
                  : submitError
                    ? submitError.message
                    : "The examination deadline has passed."}
              </p>
            </div>
            {!submitting && submitError && (
              <button
                type="button"
                onClick={() => void submitExam(true)}
                className="min-h-11 w-full rounded-full bg-[#1A4D2E] text-xs font-bold text-white hover:bg-[#153e25]"
              >
                Retry submission
              </button>
            )}
            {submitting && <Loader2 className="mx-auto size-5 animate-spin text-[#1A4D2E]" />}
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#1A4D2E]">
              <CheckCircle2 className="size-6" />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="font-serif text-2xl font-bold text-stone-900">Submit examination?</h3>
              <p className="mx-auto max-w-sm text-xs leading-relaxed text-stone-600">
                Your current answers will be sent to the backend for grading. You cannot change them
                after submission.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-700">
                Answer completion by section
              </span>
              <div className="space-y-1.5">
                {sections.map((section, sectionIndex) => {
                  const answered = section.questions.filter((question) => picks[question.id]).length;
                  return (
                    <div
                      key={`${section.subject}-${sectionIndex}`}
                      className="flex items-center justify-between text-stone-800"
                    >
                      <span>{section.label}</span>
                      <strong className="font-mono">
                        {answered} / {section.questions.length}
                      </strong>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-2.5 font-bold text-stone-900">
                <span>Total answered</span>
                <span className="font-mono text-sm text-emerald-800">
                  {answeredCount} of {questions.length}
                </span>
              </div>
            </div>

            {submitError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                {submitError.message}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSubmitConfirmOpen(false)}
                disabled={submitting}
                className="min-h-12 flex-1 rounded-full border border-stone-200 text-xs font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                Return to exam
              </button>
              <button
                type="button"
                onClick={() => void submitExam(false)}
                disabled={submitting}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] text-xs font-bold text-white shadow-xs hover:bg-[#153e25] disabled:opacity-50"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Submitting…" : "Yes, submit paper"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
