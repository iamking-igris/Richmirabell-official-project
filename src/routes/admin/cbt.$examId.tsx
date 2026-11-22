import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardPaste,
  Copy,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  weeklyExamsApi,
  type GenerationJob,
  type ReadinessReport,
  type WeeklyAudit,
  type WeeklyExam,
  type WeeklyQuestion,
  type WeeklyQuestionDraft,
} from "@/lib/backend";
import { cn } from "@/lib/cn";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/admin/cbt/$examId")({ component: ExamWorkspace });

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

const KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof KEYS)[number];

const field =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary transition-colors";
const btnGhost =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-xs font-semibold text-ink hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * All schedule values are stored in UTC and shown/entered in Nigerian
 * local time (Africa/Lagos = WAT, fixed UTC+1, no DST) so the displayed
 * window is identical no matter which browser timezone the admin uses.
 */
const LAGOS_OFFSET = "+01:00";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString(undefined, {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Stored UTC ISO timestamp → `datetime-local` value in Africa/Lagos. */
function toLagosInput(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  // Shift the instant by +1h and read it as UTC: Lagos has no DST, so a
  // single fixed offset is exact and never drifts across the year.
  const lagos = new Date(parsed.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${lagos.getUTCFullYear()}-${pad(lagos.getUTCMonth() + 1)}-${pad(
    lagos.getUTCDate(),
  )}T${pad(lagos.getUTCHours())}:${pad(lagos.getUTCMinutes())}`;
}

/** `datetime-local` value (Africa/Lagos wall time) → UTC ISO for the API. */
function fromLagosInput(local: string): string {
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)
    ? `${local}:00`
    : local;
  const parsed = new Date(`${withSeconds}${LAGOS_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date and time.");
  }
  return parsed.toISOString();
}

/**
 * A displayed Opens/Closes value that opens the shared schedule editor
 * (CBT-09): a real <button> so it is keyboard accessible, with a dotted
 * underline as the "this value is editable" affordance. Locked papers
 * (live / completed / archived) keep showing the value as plain text —
 * their schedule can never be edited.
 */
function ScheduleDateChip({
  label,
  value,
  locked,
  disabled,
  onClick,
  pill = false,
}: {
  label: string;
  value: string | null;
  locked: boolean;
  disabled: boolean;
  onClick: () => void;
  /** Publication-section chips render as the existing rounded pills. */
  pill?: boolean;
}) {
  const text = `${label} ${formatDate(value)}`;
  if (locked) {
    return (
      <span className={pill ? "rounded-full border border-line bg-white px-3 py-1" : undefined}>
        {text}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={
        pill
          ? "cursor-pointer rounded-full border border-line bg-white px-3 py-1 transition-colors hover:border-primary/50 hover:text-primary focus-visible:border-primary"
          : "cursor-pointer underline decoration-dotted underline-offset-4 transition-colors hover:text-primary focus-visible:text-primary"
      }
      title={`${label} — edit the examination schedule`}
      aria-label={`${text}. Edit examination schedule`}
      disabled={disabled}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

function readError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.details as { detail?: unknown } | undefined;
    const detail = body?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const record = detail as Record<string, unknown>;
      const parts: string[] = [];
      if (typeof record.message === "string" && record.message.trim()) parts.push(record.message);
      if (Array.isArray(record.missing)) parts.push(...record.missing.map(String));
      if (Array.isArray(record.errors)) parts.push(...record.errors.map(String));
      if (parts.length) return parts.join(" · ");
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type QuestionFormState = {
  mode: "create" | "edit";
  questionId?: string;
  prompt: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
  explanation: string;
  topic: string;
  difficulty: string;
};

/**
 * The shared schedule editor state (CBT-09): one editor creates and edits
 * the schedule, always holding BOTH dates. `expectedOpening`/
 * `expectedClosing` are the saved ISO values the editor was pre-filled
 * with — the backend compares them on save so a stale editor can never
 * overwrite a schedule another admin changed in the meantime.
 */
type ScheduleFormState = {
  opening: string; // datetime-local, Africa/Lagos wall time
  closing: string; // datetime-local, Africa/Lagos wall time
  expectedOpening: string | null;
  expectedClosing: string | null;
};

function emptyForm(): QuestionFormState {
  return {
    mode: "create",
    prompt: "",
    options: { A: "", B: "", C: "", D: "" },
    answer: "A",
    explanation: "",
    topic: "",
    difficulty: "medium",
  };
}

function formFromQuestion(question: WeeklyQuestion): QuestionFormState {
  return {
    mode: "edit",
    questionId: question.id,
    prompt: question.question_text,
    options: {
      A: question.options.A ?? "",
      B: question.options.B ?? "",
      C: question.options.C ?? "",
      D: question.options.D ?? "",
    },
    answer: (KEYS.includes(question.correct_answer as OptionKey)
      ? question.correct_answer
      : "A") as OptionKey,
    explanation: question.explanation ?? "",
    topic: question.topic ?? "",
    difficulty: question.difficulty || "medium",
  };
}

type PastedQuestion = {
  prompt: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  topic: string;
};

/**
 * Tolerant paste parser: accepts either a JSON array / {questions:[…]} or a
 * plain-text block where each question is separated by a blank line with
 * `A. …` options, `Answer: X`, `Explanation: …` and `Topic: …` lines.
 */
function parsePastedQuestions(raw: string): { questions: PastedQuestion[]; errors: string[] } {
  const text = raw.trim();
  const errors: string[] = [];
  if (!text) return { questions: [], errors: ["Nothing pasted."] };

  const normalize = (entry: Record<string, unknown>): PastedQuestion | null => {
    const prompt = String(entry.prompt ?? entry.question_text ?? "").trim();
    const rawOptions = entry.options;
    const options: Record<string, string> = {};
    if (Array.isArray(rawOptions)) {
      for (const option of rawOptions) {
        const key = String((option as Record<string, unknown>)?.key ?? "").trim().toUpperCase();
        const value = String((option as Record<string, unknown>)?.text ?? "").trim();
        if (key && value) options[key] = value;
      }
    } else if (rawOptions && typeof rawOptions === "object") {
      for (const [key, value] of Object.entries(rawOptions as Record<string, unknown>)) {
        const normalizedKey = key.trim().toUpperCase();
        if (normalizedKey && String(value ?? "").trim()) options[normalizedKey] = String(value).trim();
      }
    }
    const answer = String(entry.answer ?? entry.correct_answer ?? "").trim().toUpperCase();
    if (!prompt) return null;
    if (Object.keys(options).length !== 4) return null;
    if (!KEYS.includes(answer as OptionKey)) return null;
    return {
      prompt,
      options,
      answer,
      explanation: String(entry.explanation ?? entry.explain ?? "").trim(),
      topic: String(entry.topic ?? "").trim(),
    };
  };

  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as Record<string, unknown>)?.questions)
          ? ((parsed as Record<string, unknown>).questions as unknown[])
          : null;
      if (list) {
        const questions: PastedQuestion[] = [];
        list.forEach((entry, index) => {
          const question = normalize(entry as Record<string, unknown>);
          if (question) questions.push(question);
          else errors.push(`JSON entry ${index + 1} was skipped (needs prompt, 4 options, A-D answer).`);
        });
        if (questions.length) return { questions, errors };
      }
    } catch {
      errors.push("Looks like JSON but could not be parsed; trying plain text.");
    }
  }

  const questions: PastedQuestion[] = [];
  const blocks = text.split(/\n\s*\n+/);
  blocks.forEach((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const options: Record<string, string> = {};
    const promptLines: string[] = [];
    let answer = "";
    let explanation = "";
    let topic = "";
    let readingExplanation = false;

    for (const line of lines) {
      const optionMatch = line.match(/^([A-D])[\).:\-]\s+(.+)$/i);
      const answerMatch = line.match(/^(?:answer|correct\s+answer|key)\s*[:\-]\s*([A-D])\b/i);
      const explainMatch = line.match(/^(?:explanation|explain|reason|why)\s*[:\-]?\s*(.*)$/i);
      const topicMatch = line.match(/^topic\s*[:\-]\s*(.*)$/i);
      const questionMatch = line.match(/^(?:q(?:uestion)?\s*\d*[\).:\-])\s*(.*)$/i);

      if (answerMatch) {
        answer = answerMatch[1].toUpperCase();
      } else if (explainMatch) {
        readingExplanation = true;
        explanation = explainMatch[1] ?? "";
      } else if (topicMatch) {
        topic = topicMatch[1] ?? "";
      } else if (optionMatch && !readingExplanation) {
        options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
      } else if (readingExplanation) {
        explanation = `${explanation} ${line}`.trim();
      } else if (questionMatch) {
        promptLines.push(questionMatch[1].trim());
      } else {
        promptLines.push(line);
      }
    }

    const prompt = promptLines.join(" ").trim();
    if (!prompt) {
      errors.push(`Block ${index + 1} has no question text.`);
      return;
    }
    if (Object.keys(options).length !== 4) {
      errors.push(`Block ${index + 1} must have four options labelled A–D.`);
      return;
    }
    if (!KEYS.includes(answer as OptionKey)) {
      errors.push(`Block ${index + 1} is missing "Answer: A|B|C|D".`);
      return;
    }
    questions.push({ prompt, options, answer, explanation, topic });
  });

  return { questions, errors };
}

function ExamWorkspace() {
  const { examId } = Route.useParams();

  const [exam, setExam] = useState<WeeklyExam | null>(null);
  const [questions, setQuestions] = useState<WeeklyQuestion[]>([]);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [audit, setAudit] = useState<WeeklyAudit | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);

  const [subject, setSubject] = useState("english");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [log, setLog] = useState<string[]>([]);

  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkApprovingForSubject, setBulkApprovingForSubject] = useState<string | null>(null);

  const [form, setForm] = useState<QuestionFormState | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const navigate = useNavigate();

  const sections = useMemo(() => exam?.sections ?? [], [exam]);
  const sectionBySubject = useMemo(
    () => Object.fromEntries(sections.map((section) => [section.subject_id, section])),
    [sections],
  );
  const activeSection = sectionBySubject[subject] ?? sections[0] ?? null;
  const subjectQuestions = useMemo(
    () =>
      questions
        .filter((question) => question.subject === subject)
        .sort((a, b) => a.display_order - b.display_order),
    [questions, subject],
  );
  const pendingReviewCount = useMemo(
    () => subjectQuestions.filter((question) => question.review_status === "needs_review").length,
    [subjectQuestions],
  );

  const approvedCount = useMemo(
    () => questions.filter((question) => question.review_status === "approved").length,
    [questions],
  );

  const pushLog = useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((current) => [`${stamp} · ${line}`, ...current].slice(0, 40));
  }, []);

  const refresh = useCallback(async () => {
    const [nextExam, nextQuestions, nextReadiness, jobs] = await Promise.all([
      weeklyExamsApi.get(examId),
      weeklyExamsApi.questions(examId),
      weeklyExamsApi.readiness(examId),
      weeklyExamsApi.jobs(examId).catch(() => [] as GenerationJob[]),
    ]);
    setExam(nextExam);
    setQuestions(Array.isArray(nextQuestions) ? nextQuestions : []);
    setReadiness(nextReadiness);
    const active =
      jobs.find((entry) => ["pending", "running", "partial"].includes(entry.status)) ?? jobs[0] ?? null;
    setJob(active);
    return nextExam;
  }, [examId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          const message = readError(err, "Could not load this examination.");
          const isMissingExam =
            err instanceof ApiError && [400, 404].includes(err.statusCode)
              ? true
              : /not found|does not exist|invalid.*examination/i.test(message);
          if (isMissingExam) {
            void navigate({ to: "/admin/cbt" });
            return;
          }
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /* ------------------------------------------------------------------ */
  /* Generation (controlled Gemini batches, persisted server-side)       */
  /* ------------------------------------------------------------------ */

  async function runGeneration(target?: string, jobOverride?: GenerationJob | null) {
    if (running) return;
    setRunning(true);
    setError("");
    setNotice("");
    try {
      const known = jobOverride ?? job;
      let active: GenerationJob | null =
        known && ["pending", "running", "partial"].includes(known.status) ? known : null;

      if (active) {
        pushLog(
          `Resuming job ${active.id.slice(0, 8)} · ${active.batches.filter((batch) => batch.batch_status === "pending").length} pending batches.`,
        );
        // Recover batches left mid-flight by a closed tab or restart.
        for (const stale of active.batches.filter((batch) => batch.batch_status === "generating")) {
          await weeklyExamsApi.retryBatch(stale.id).catch(() => undefined);
          pushLog(`Reset stale batch ${stale.batch_identifier} for recovery.`);
        }
      } else {
        active = await weeklyExamsApi.startGeneration(examId, {
          generation_mode: target ? "subject" : "full",
          subjects: target ? [target] : undefined,
          batch_size: 10,
        });
        pushLog(`Started generation: ${active.batches.length} batches, ${active.requested_count} questions planned.`);
      }

      const sectionSubjects = new Map(
        (exam?.sections ?? []).map((section) => [section.id, section.subject_id]),
      );
      const excludeBySubject = new Map<string, string[]>();
      for (const section of exam?.sections ?? []) {
        const existing = await weeklyExamsApi.questions(examId, section.subject_id);
        excludeBySubject.set(
          section.subject_id,
          existing.map((question) => question.question_text),
        );
      }

      let stop = false;
      while (active && !stop) {
        const pending = active.batches.filter(
          (batch) =>
            batch.batch_status === "pending" &&
            (!target || sectionSubjects.get(batch.section_id) === target),
        );
        if (!pending.length) break;

        for (const batch of pending) {
          const batchSubject = sectionSubjects.get(batch.section_id) ?? target ?? "english";
          try {
            await weeklyExamsApi.startBatch(batch.id);
            const relay = await weeklyExamsApi.generateWithGemini({
              subject: batchSubject,
              count: batch.expected_count,
              exclude_prompts: (excludeBySubject.get(batchSubject) ?? []).slice(0, 60),
            });
            const base = questions.filter((question) => question.subject === batchSubject).length;
            const mapped: WeeklyQuestionDraft[] = relay.questions.map((question, index) => ({
              section_id: batch.section_id,
              question_text: question.prompt,
              options: question.options,
              correct_answer: question.answer,
              explanation: question.explanation,
              subject: batchSubject,
              topic: question.topic,
              subtopic: null,
              difficulty: question.difficulty,
              passage_reference: null,
              passage_data: null,
              generation_provenance: "ai_generated",
              review_status: "needs_review",
              display_order: base + index,
            }));
            const result = await weeklyExamsApi.persistBatch({
              job_id: active.id,
              batch_identifier: batch.batch_identifier,
              results: [{ section_id: batch.section_id, questions: mapped }],
            });
            pushLog(
              `${SUBJECT_LABELS[batchSubject] ?? batchSubject}: ${result.persisted} saved, ${result.duplicates} duplicates skipped, ${result.rejected} rejected.`,
            );
            if (relay.types) {
              const mix = Object.entries(relay.types)
                .map(([type, amount]) => `${type}: ${amount}`)
                .join(", ");
              pushLog(`${SUBJECT_LABELS[batchSubject] ?? batchSubject} question-type mix — ${mix}.`);
            }
            if (relay.repair_notes?.length) {
              pushLog(
                `${SUBJECT_LABELS[batchSubject] ?? batchSubject} validation: ${relay.repair_notes.join("; ")}.`,
              );
            }
            excludeBySubject.set(batchSubject, [
              ...(excludeBySubject.get(batchSubject) ?? []),
              ...relay.questions.map((question) => question.prompt),
            ]);
          } catch (err) {
            const failure = err as Error & { code?: string };
            const code = failure.code ?? "bad_output";
            pushLog(`${SUBJECT_LABELS[batchSubject] ?? batchSubject}: batch failed (${code}) — ${failure.message}`);
            await weeklyExamsApi
              .persistBatch({
                job_id: active.id,
                batch_identifier: batch.batch_identifier,
                results: [],
                error_classification: code,
              })
              .catch(() => undefined);
            if (["quota", "rate_limit", "key_missing", "auth_required"].includes(code)) {
              setError(failure.message);
              stop = true;
              break;
            }
          }
          active = await weeklyExamsApi.getJob(active.id);
          setJob(active);
        }
      }

      const finalJob = active ? await weeklyExamsApi.getJob(active.id) : null;
      if (finalJob) setJob(finalJob);
      await refresh();
      if (finalJob) {
        pushLog(
          `Job ${finalJob.status}: ${finalJob.generated_count}/${finalJob.requested_count} questions, ${finalJob.completed_batches} batches complete, ${finalJob.failed_batches} failed.`,
        );
        if (finalJob.status === "completed") {
          setNotice("Generation finished. Review the questions for uniqueness, then approve them.");
        } else if (["partial", "failed"].includes(finalJob.status)) {
          setNotice(
            finalJob.failure_details ??
              "Some batches did not complete. Retry only the failed batches below.",
          );
        }
      }
    } catch (err) {
      setError(readError(err, "Generation could not start."));
    } finally {
      setRunning(false);
    }
  }

  async function retryFailedBatches() {
    if (!job || running) return;
    setRunning(true);
    setError("");
    try {
      const retryable = job.batches.filter((batch) =>
        ["failed", "partially_completed", "generating"].includes(batch.batch_status),
      );
      for (const batch of retryable) {
        await weeklyExamsApi.retryBatch(batch.id);
        pushLog(`Queued retry for ${batch.batch_identifier}.`);
      }
      const refreshed = await weeklyExamsApi.getJob(job.id);
      setJob(refreshed);
      setRunning(false);
      await runGeneration(undefined, refreshed);
    } catch (err) {
      setError(readError(err, "Could not queue the failed batches for retry."));
      setRunning(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle actions                                                  */
  /* ------------------------------------------------------------------ */

  async function runAction(
    action: () => Promise<unknown>,
    success: string,
    failure: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(readError(err, failure));
    } finally {
      setBusy(false);
    }
  }

  function publishNow() {
    return runAction(async () => {
      if (!exam?.opening_at || !exam.closing_at) {
        throw new ApiError(
          "Set both an opening and a closing time in the schedule editor before publishing.",
          400,
          "bad_request",
        );
      }
      const report = await weeklyExamsApi.readiness(examId, true);
      setReadiness(report);
      if (!report.can_publish) {
        throw new ApiError(
          ["Not ready to publish", ...report.missing, ...report.errors].join(" · "),
          400,
          "not_ready",
        );
      }
      const result = await weeklyExamsApi.publish(examId, { publish_now: true });
      if (result.note) pushLog(result.note);
    }, "Examination published.", "The examination could not be published.");
  }

  /* ------------------------------------------------------------------ */
  /* Schedule editor (CBT-08 / CBT-09) — one shared editor for both     */
  /* dates, opened from the form button or by clicking either displayed */
  /* Opens/Closes value.                                                 */
  /* ------------------------------------------------------------------ */

  function openScheduleEditor() {
    // One editor only: re-clicking a date while it is open keeps any
    // in-progress edits instead of resetting them.
    if (!exam || scheduleForm || scheduleBusy || locked) return;
    setScheduleError("");
    setScheduleForm({
      opening: toLagosInput(exam.opening_at),
      closing: toLagosInput(exam.closing_at),
      expectedOpening: exam.opening_at,
      expectedClosing: exam.closing_at,
    });
  }

  function cancelScheduleEditor() {
    // Cancel never calls the backend: the local edits are simply dropped.
    if (scheduleBusy) return;
    setScheduleForm(null);
    setScheduleError("");
  }

  async function saveSchedule() {
    if (!scheduleForm || scheduleBusy) return;
    const { opening, closing, expectedOpening, expectedClosing } = scheduleForm;

    // Frontend validation (backend validation is mandatory and runs too).
    if (!opening || !closing) {
      setScheduleError("Both an opening and a closing date and time are required.");
      return;
    }
    let openingIso: string;
    let closingIso: string;
    try {
      openingIso = fromLagosInput(opening);
      closingIso = fromLagosInput(closing);
    } catch {
      setScheduleError("Enter a valid opening and closing date and time.");
      return;
    }
    if (new Date(closingIso).getTime() <= new Date(openingIso).getTime()) {
      setScheduleError("The closing date and time must be later than the opening date and time.");
      return;
    }

    setScheduleBusy(true);
    setScheduleError("");
    setNotice("");
    try {
      const saved = await weeklyExamsApi.schedule(examId, {
        opening_at: openingIso,
        closing_at: closingIso,
        expected_opening_at: expectedOpening,
        expected_closing_at: expectedClosing,
      });
      // Update from the authoritative saved examination, then close.
      setExam(saved);
      setScheduleForm(null);
      setNotice("Examination schedule saved.");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        // The schedule changed while this editor was open: never overwrite
        // it — load the latest saved values into the editor for review.
        const body = err.details as
          | {
              detail?: {
                message?: string;
                opening_at?: string | null;
                closing_at?: string | null;
              };
            }
          | undefined;
        const detail = body?.detail;
        setScheduleForm({
          opening: toLagosInput(detail?.opening_at),
          closing: toLagosInput(detail?.closing_at),
          expectedOpening: detail?.opening_at ?? null,
          expectedClosing: detail?.closing_at ?? null,
        });
        setScheduleError(
          detail?.message ||
            "The schedule changed since you opened the editor. Review the latest values and save again.",
        );
        await refresh().catch(() => undefined);
      } else {
        // Keep the editor open with the values the admin typed so the
        // save can be retried; the stored schedule is untouched.
        setScheduleError(readError(err, "The schedule could not be saved."));
      }
    } finally {
      setScheduleBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Question CRUD                                                      */
  /* ------------------------------------------------------------------ */

  async function saveQuestion() {
    if (!form || !activeSection) return;
    if (!form.prompt.trim()) {
      setError("The question text is required.");
      return;
    }
    for (const key of KEYS) {
      if (!form.options[key].trim()) {
        setError(`Option ${key} is required.`);
        return;
      }
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (form.mode === "create") {
        await weeklyExamsApi.addQuestion({
          section_id: activeSection.id,
          question_text: form.prompt.trim(),
          options: {
            A: form.options.A.trim(),
            B: form.options.B.trim(),
            C: form.options.C.trim(),
            D: form.options.D.trim(),
          },
          correct_answer: form.answer,
          explanation: form.explanation.trim(),
          subject,
          topic: form.topic.trim() || null,
          subtopic: null,
          difficulty: form.difficulty,
          passage_reference: null,
          passage_data: null,
          generation_provenance: "manual",
          review_status: "needs_review",
          display_order: subjectQuestions.length,
        });
        setNotice("Question added to the pool.");
      } else if (form.questionId) {
        await weeklyExamsApi.updateQuestion(form.questionId, {
          question_text: form.prompt.trim(),
          options: {
            A: form.options.A.trim(),
            B: form.options.B.trim(),
            C: form.options.C.trim(),
            D: form.options.D.trim(),
          },
          correct_answer: form.answer,
          explanation: form.explanation.trim(),
          topic: form.topic.trim() || null,
          difficulty: form.difficulty,
        });
        setNotice("Question updated.");
      }
      setForm(null);
      await refresh();
    } catch (err) {
      setError(readError(err, "The question could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function approvePendingForSubject() {
    const pending = subjectQuestions.filter((question) => question.review_status === "needs_review");
    if (!pending.length) return;

    const subjectName = SUBJECT_LABELS[subject] ?? subject;
    const confirmed = window.confirm(
      `Approve all ${pending.length} pending ${subjectName} question${pending.length === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;

    const previousQuestions = [...questions];
    const approvedIds: string[] = [];
    setBulkApprovingForSubject(subject);
    setQuestions((current) =>
      current.map((question) =>
        pending.some((entry) => entry.id === question.id)
          ? { ...question, review_status: "approved" }
          : question,
      ),
    );

    try {
      for (const question of pending) {
        await weeklyExamsApi.approveQuestion(question.id, true);
        approvedIds.push(question.id);
      }
      setNotice(`${pending.length} pending ${subjectName} question${pending.length === 1 ? "" : "s"} approved.`);
      await refresh();
    } catch (err) {
      for (const questionId of approvedIds) {
        try {
          await weeklyExamsApi.approveQuestion(questionId, false);
        } catch {
          // Best-effort rollback of already-approved rows after a bulk failure.
        }
      }
      setQuestions(previousQuestions);
      setError(readError(err, `Could not approve all ${subjectName} questions.`));
    } finally {
      setBulkApprovingForSubject(null);
    }
  }

  async function toggleApprove(question: WeeklyQuestion) {
    const approved = question.review_status !== "approved";
    try {
      await weeklyExamsApi.approveQuestion(question.id, approved);
      await refresh();
    } catch (err) {
      setError(readError(err, "Could not update the review status."));
    }
  }

  function duplicateQuestion(question: WeeklyQuestion) {
    // Exact copies are rejected by the backend's duplicate guard, so the
    // "duplicate" action opens the create form pre-filled: the admin
    // reviews (and usually rewords) the question before adding it.
    const base = formFromQuestion(question);
    setForm({ ...base, mode: "create", questionId: undefined });
    setNotice("Copied into a new question form — edit it, then save to add it to the pool.");
  }

  async function deleteQuestion(question: WeeklyQuestion) {
    if (busy) return;
    setBusy(true);
    const previous = questions;
    setQuestions((current) => current.filter((item) => item.id !== question.id));
    setError("");
    setNotice("");
    try {
      await weeklyExamsApi.deleteQuestion(question.id);
      setNotice("Question deleted.");
      void refresh().catch(() => undefined);
    } catch (err) {
      setQuestions(previous);
      setError(readError(err, "Could not delete the question. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function importPasted() {
    const parsed = parsePastedQuestions(pasteText);
    setPasteErrors(parsed.errors);
    if (!parsed.questions.length || !activeSection) return;
    setBusy(true);
    try {
      let added = 0;
      for (const question of parsed.questions) {
        await weeklyExamsApi.addQuestion({
          section_id: activeSection.id,
          question_text: question.prompt,
          options: question.options,
          correct_answer: question.answer,
          explanation: question.explanation,
          subject,
          topic: question.topic || null,
          subtopic: null,
          difficulty: "medium",
          passage_reference: null,
          passage_data: null,
          generation_provenance: "manual",
          review_status: "needs_review",
          display_order: subjectQuestions.length + added,
        });
        added += 1;
      }
      setNotice(`${added} questions imported into ${SUBJECT_LABELS[subject] ?? subject}.`);
      setPasteText("");
      setPasteOpen(false);
      await refresh();
    } catch (err) {
      setError(readError(err, "Import stopped early."));
    } finally {
      setBusy(false);
    }
  }

  async function runAudit() {
    setBusy(true);
    setError("");
    try {
      const result = await weeklyExamsApi.audit(examId);
      setAudit(result);
      setAuditOpen(true);
    } catch (err) {
      setError(readError(err, "The audit could not run."));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !exam) {
    return (
      <div className="mx-auto max-w-6xl py-10 text-center text-sm text-muted">
        <p className="font-display text-3xl text-ink">Opening the examination workspace…</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10 text-center">
        <p className="font-display text-3xl text-ink">Examination not found</p>
        <p className="text-sm text-muted">{error || "This weekly examination does not exist."}</p>
        <Link to="/admin/cbt" className={btnPrimary}>
          Back to control center
        </Link>
      </div>
    );
  }

  const totalRequired = sections.reduce((sum, section) => sum + section.required_count, 0);
  const totalGenerated = sections.reduce((sum, section) => sum + section.generated_count, 0);
  const readinessSections = readiness ? Object.values(readiness.sections) : [];
  const readySections = readiness ? readinessSections.filter((section) => section.ready).length : 0;
  const canPublish = readiness?.can_publish ?? false;
  const locked = ["live", "completed", "archived"].includes(exam.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            to="/admin/cbt"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-primary"
          >
            <ArrowLeft className="size-3.5" /> Control center
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl text-ink">{exam.title}</h1>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                STATUS_BADGE[exam.status] ?? "bg-soft text-muted",
              )}
            >
              {STATUS_LABELS[exam.status] ?? exam.status}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {exam.description}
            {exam.week_identifier ? ` · ${exam.week_identifier}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            <span>
              Pool {totalGenerated}/{totalRequired} generated
            </span>
            <span>
              {approvedCount}/{totalGenerated || 0} approved
            </span>
            <ScheduleDateChip
              label="Opens"
              value={exam.opening_at}
              locked={locked}
              disabled={scheduleBusy}
              onClick={openScheduleEditor}
            />
            <ScheduleDateChip
              label="Closes"
              value={exam.closing_at}
              locked={locked}
              disabled={scheduleBusy}
              onClick={openScheduleEditor}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnGhost}
            disabled={busy || locked}
            onClick={() =>
              void runAction(
                () => weeklyExamsApi.saveDraft(examId),
                "Saved as draft.",
                "Could not save the draft.",
              )
            }
          >
            Save draft
          </button>
          <button
            type="button"
            className={btnGhost}
            disabled={busy || locked}
            onClick={() =>
              void runAction(
                () => weeklyExamsApi.markReady(examId),
                "Marked ready for review.",
                "Could not mark ready.",
              )
            }
          >
            Mark ready
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || locked || running}
            onClick={() => void publishNow()}
          >
            <Check className="size-3.5" /> Publish now
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {/* Lifecycle + schedule bar */}
      <section className="rounded-3xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Publication</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
              <ScheduleDateChip
                pill
                label="Opens"
                value={exam.opening_at}
                locked={locked}
                disabled={scheduleBusy}
                onClick={openScheduleEditor}
              />
              <ScheduleDateChip
                pill
                label="Closes"
                value={exam.closing_at}
                locked={locked}
                disabled={scheduleBusy}
                onClick={openScheduleEditor}
              />
              {exam.status === "scheduled" && (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    void runAction(
                      () => weeklyExamsApi.cancelSchedule(examId),
                      "Schedule cancelled; the paper is back in draft.",
                      "Could not cancel the schedule.",
                    )
                  }
                >
                  Cancel schedule
                </button>
              )}
              {(exam.status === "live" || exam.status === "completed") && (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    void runAction(
                      () => weeklyExamsApi.archive(examId),
                      "Examination archived.",
                      "Could not archive.",
                    )
                  }
                >
                  Archive
                </button>
              )}
              {exam.status === "archived" && (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    void runAction(
                      () => weeklyExamsApi.restore(examId),
                      "Examination restored.",
                      "Could not restore.",
                    )
                  }
                >
                  Restore
                </button>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-xs text-muted">
              {canPublish
                ? "Readiness checks pass: every section is complete and approved."
                : "Readiness must pass before publication — incomplete papers cannot be published."}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {!scheduleForm && (
              <button
                type="button"
                className={btnGhost}
                disabled={busy || locked}
                onClick={openScheduleEditor}
              >
                <Pencil className="size-3.5" />
                {exam.opening_at && exam.closing_at ? "Edit schedule" : "Schedule examination"}
              </button>
            )}
          </div>
        </div>

        {/* One shared editor for BOTH dates (CBT-08/09): used for the very
            first schedule and for every later edit — reached from the
            button above or by clicking either displayed Opens/Closes value. */}
        {scheduleForm && (
          <div
            className="mt-4 rounded-2xl border border-line bg-white p-4"
            role="group"
            aria-labelledby="schedule-editor-heading"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id="schedule-editor-heading" className="text-sm font-semibold text-ink">
                {exam.opening_at && exam.closing_at
                  ? "Edit examination schedule"
                  : "Schedule examination"}
              </h3>
              <button
                type="button"
                aria-label="Close the schedule editor"
                className="cursor-pointer rounded-full p-1.5 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                disabled={scheduleBusy}
                onClick={cancelScheduleEditor}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Opening date and time
                <input
                  type="datetime-local"
                  value={scheduleForm.opening}
                  disabled={scheduleBusy}
                  onChange={(event) =>
                    setScheduleForm((current) =>
                      current ? { ...current, opening: event.target.value } : current,
                    )
                  }
                  className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-primary disabled:opacity-60"
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Closing date and time
                <input
                  type="datetime-local"
                  value={scheduleForm.closing}
                  disabled={scheduleBusy}
                  onChange={(event) =>
                    setScheduleForm((current) =>
                      current ? { ...current, closing: event.target.value } : current,
                    )
                  }
                  className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-primary disabled:opacity-60"
                />
              </label>
            </div>

            {scheduleError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                {scheduleError}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={scheduleBusy}
                onClick={() => void saveSchedule()}
              >
                {scheduleBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {scheduleBusy
                  ? "Saving…"
                  : exam.opening_at && exam.closing_at
                    ? "Save schedule changes"
                    : "Schedule examination"}
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={scheduleBusy}
                onClick={cancelScheduleEditor}
              >
                Cancel
              </button>
            </div>

            <p className="mt-2 text-[11px] text-muted">
              Both times are entered in Nigerian time (Africa/Lagos, WAT) and saved
              together — the closing time must be later than the opening time. Saving a
              schedule never publishes the examination.
            </p>
          </div>
        )}
      </section>

      {/* Generation panel */}
      <section className="rounded-3xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Gemini batch generation
            </p>
            <p className="mt-1 text-sm text-ink">
              {job
                ? `${job.completed_batches}/${job.batches.length} batches complete · ${job.generated_count}/${job.requested_count} questions persisted · ${job.failed_batches} failed`
                : "No generation job yet for this paper."}
              {job?.failure_details ? ` · ${job.failure_details}` : ""}
            </p>
            {job && (
              <div className="mt-2 h-2 max-w-md rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${
                      job.requested_count
                        ? Math.min(100, Math.round((job.generated_count / job.requested_count) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={running || locked || exam.status === "scheduled"}
              onClick={() => void runGeneration()}
            >
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {running
                ? "Generating…"
                : job && ["pending", "running", "partial"].includes(job.status)
                  ? "Resume generation"
                  : "Generate missing questions"}
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={running || !job}
              onClick={() => void retryFailedBatches()}
            >
              <RefreshCw className="size-3.5" /> Retry failed batches
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={running || locked}
              onClick={() =>
                void runGeneration(subject).catch(() => undefined)
              }
            >
              Generate {SUBJECT_LABELS[subject] ?? subject}
            </button>
          </div>
        </div>

        {job && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {job.batches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[11px]"
              >
                <span className="truncate font-mono text-muted">{batch.batch_identifier}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider",
                    batch.batch_status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : batch.batch_status === "failed"
                        ? "bg-rose-100 text-rose-700"
                        : batch.batch_status === "partially_completed"
                          ? "bg-amber-100 text-amber-800"
                          : batch.batch_status === "generating"
                            ? "bg-primary/10 text-primary"
                            : "bg-soft text-muted",
                  )}
                >
                  {batch.batch_status.replace("_", " ")}
                  {batch.error_classification ? ` · ${batch.error_classification}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {log.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-2xl border border-line bg-white p-3">
            {log.map((line, index) => (
              <p key={`${index}-${line.slice(0, 24)}`} className="font-mono text-[11px] text-muted">
                {line}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Subject sections + questions */}
      <section className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="space-y-3 rounded-3xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl text-ink">Subject pools</h2>
          <div className="space-y-2">
            {sections.map((section) => {
              const approved = questions.filter(
                (question) =>
                  question.subject === section.subject_id && question.review_status === "approved",
              ).length;
              const percent = section.required_count
                ? Math.min(100, Math.round((section.generated_count / section.required_count) * 100))
                : 0;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSubject(section.subject_id)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-colors",
                    subject === section.subject_id
                      ? "border-primary bg-primary/5"
                      : "border-line bg-white hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-ink">
                      {SUBJECT_LABELS[section.subject_id] ?? section.subject_id}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {section.section_status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {section.generated_count}/{section.required_count} generated · {approved} approved
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-soft">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-line bg-white p-3 text-xs text-muted">
            <p className="font-semibold uppercase tracking-[0.14em] text-ink">Readiness</p>
            <ul className="mt-2 space-y-1">
              <li>
                Sections complete:{" "}
                {readiness ? `${readySections}/${readinessSections.length}` : "—"}
              </li>
              <li>All approved: {readiness ? (readiness.all_approved ? "yes" : "no") : "—"}</li>
              <li>Can publish: {canPublish ? "yes" : "no"}</li>
            </ul>
            {(readiness?.missing.length ?? 0) > 0 && (
              <p className="mt-2 text-rose-700">Missing: {readiness?.missing.join(", ")}</p>
            )}
            {(readiness?.errors.length ?? 0) > 0 && (
              <p className="mt-1 text-rose-700">{readiness?.errors.join(" · ")}</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {SUBJECT_LABELS[subject] ?? subject} pool
              </p>
              <h2 className="font-display text-2xl text-ink">{subjectQuestions.length} questions</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(emptyForm())}>
                <Plus className="size-3.5" /> Add manual
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy || running || bulkApprovingForSubject === subject || pendingReviewCount === 0}
                onClick={() => void approvePendingForSubject()}
              >
                {bulkApprovingForSubject === subject ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve all{pendingReviewCount ? ` (${pendingReviewCount})` : ""}
              </button>
              <button type="button" className={btnGhost} onClick={() => setPasteOpen(true)}>
                <ClipboardPaste className="size-3.5" /> Paste block
              </button>
              <button type="button" className={btnGhost} onClick={() => setPreviewOpen(true)}>
                <Eye className="size-3.5" /> Preview paper
              </button>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => void runAudit()}>
                <ShieldCheck className="size-3.5" /> Uniqueness audit
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {subjectQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                No questions in this pool yet. Generate them with Gemini, add them manually, or paste a
                block of prepared questions.
              </div>
            ) : (
              subjectQuestions.map((question, index) => {
                const approved = question.review_status === "approved";
                return (
                  <article key={question.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {index + 1}. {question.question_text}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                          approved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {approved ? "approved" : question.review_status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {KEYS.map((key) => (
                        <p
                          key={key}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs",
                            question.correct_answer === key
                              ? "bg-emerald-50 font-semibold text-emerald-800"
                              : "bg-soft text-muted",
                          )}
                        >
                          {key}. {question.options[key]}
                        </p>
                      ))}
                    </div>
                    {question.explanation && (
                      <p className="mt-2 rounded-lg bg-sky-50 px-2.5 py-2 text-xs text-sky-900">
                        {question.explanation}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => void toggleApprove(question)}
                      >
                        <Check className="size-3.5" /> {approved ? "Unapprove" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => setForm(formFromQuestion(question))}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => void duplicateQuestion(question)}
                      >
                        <Copy className="size-3.5" /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700"
                        onClick={() => void deleteQuestion(question)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Manual / edit form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-ink">
                {form.mode === "create" ? "Add a question" : "Edit question"}
              </h3>
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <textarea
                value={form.prompt}
                onChange={(event) => setForm({ ...form, prompt: event.target.value })}
                placeholder="Question prompt"
                rows={3}
                className={field}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="answer"
                      checked={form.answer === key}
                      onChange={() => setForm({ ...form, answer: key })}
                      className="size-4 accent-[var(--color-primary,#1A4D2E)]"
                    />
                    <span className="text-xs font-semibold text-muted">{key}</span>
                    <input
                      value={form.options[key]}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          options: { ...form.options, [key]: event.target.value },
                        })
                      }
                      placeholder={`Option ${key}`}
                      className={field}
                    />
                  </label>
                ))}
              </div>
              <textarea
                value={form.explanation}
                onChange={(event) => setForm({ ...form, explanation: event.target.value })}
                placeholder="Explanation (shown to students after submission)"
                rows={2}
                className={field}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.topic}
                  onChange={(event) => setForm({ ...form, topic: event.target.value })}
                  placeholder="Topic"
                  className={field}
                />
                <select
                  value={form.difficulty}
                  onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
                  className={field}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void saveQuestion()}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Save question
              </button>
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste block */}
      {pasteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-ink">
                Paste questions into {SUBJECT_LABELS[subject] ?? subject}
              </h3>
              <button type="button" className={btnGhost} onClick={() => setPasteOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Separate questions with a blank line. Each block needs the prompt, options labelled A–D,
              an <code>Answer: A|B|C|D</code> line and optionally <code>Explanation:</code> and{" "}
              <code>Topic:</code>. A JSON array of the same shape is also accepted.
            </p>
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={12}
              placeholder={"Question text here?\nA. First option\nB. Second option\nC. Third option\nD. Fourth option\nAnswer: B\nExplanation: Why B is correct\nTopic: Waves"}
              className={`${field} mt-3 font-mono`}
            />
            {pasteErrors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-rose-700">
                {pasteErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={busy || !pasteText.trim()}
                onClick={() => void importPasted()}
              >
                Import
              </button>
              <button type="button" className={btnGhost} onClick={() => setPasteOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl text-ink">Paper preview</h3>
                <p className="text-xs text-muted">
                  Admin view — answers and explanations are visible here only. Students receive the
                  sanitized paper without answer keys.
                </p>
              </div>
              <button type="button" className={btnGhost} onClick={() => setPreviewOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] space-y-6 overflow-y-auto pr-1">
              {sections.map((section) => {
                const list = questions.filter((question) => question.subject === section.subject_id);
                if (!list.length) return null;
                return (
                  <div key={section.id}>
                    <h4 className="font-display text-xl text-ink">
                      {SUBJECT_LABELS[section.subject_id] ?? section.subject_id} ({list.length}/
                      {section.required_count})
                    </h4>
                    <ol className="mt-2 space-y-2">
                      {list.slice(0, 200).map((question, index) => (
                        <li key={question.id} className="rounded-xl border border-line p-3 text-xs">
                          <p className="font-semibold text-ink">
                            {index + 1}. {question.question_text}
                          </p>
                          <p className="mt-1 text-muted">
                            {KEYS.map(
                              (key) => `${key}) ${question.options[key] ?? ""}`,
                            ).join("   ")}
                          </p>
                          <p className="mt-1 font-semibold text-emerald-800">
                            Answer: {question.correct_answer}
                          </p>
                          {question.explanation && (
                            <p className="mt-1 text-muted">{question.explanation}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Audit */}
      {auditOpen && audit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl text-ink">Uniqueness audit</h3>
                <p className="text-xs text-muted">{audit.method}</p>
              </div>
              <button type="button" className={btnGhost} onClick={() => setAuditOpen(false)}>
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <AuditStat label="Errors" value={audit.summary.errors} tone="rose" />
              <AuditStat label="Warnings" value={audit.summary.warnings} tone="amber" />
              <AuditStat label="Duplicate pairs" value={audit.summary.duplicate_pairs} tone="amber" />
              <AuditStat
                label="Cross-paper matches"
                value={audit.summary.cross_paper_matches}
                tone="amber"
              />
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <AlertTriangle className="size-3.5" />
              Compared against {audit.previous_examinations_compared} previous papers. Nothing is
              deleted automatically — review each finding and act manually.
            </p>

            <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {audit.findings.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  No duplicates, invalid questions or schedule problems found.
                </p>
              ) : (
                audit.findings.map((finding, index) => (
                  <div
                    key={`${finding.type}-${index}`}
                    className={cn(
                      "rounded-xl border p-3 text-xs",
                      finding.severity === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-amber-200 bg-amber-50 text-amber-900",
                    )}
                  >
                    <p className="font-semibold uppercase tracking-[0.12em]">
                      {finding.type.replace(/_/g, " ")}
                      {finding.subject ? ` · ${finding.subject}` : ""}
                      {finding.similarity !== undefined
                        ? ` · ${Math.round(finding.similarity * 100)}% similar`
                        : ""}
                    </p>
                    <p className="mt-1">{finding.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "emerald";
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-emerald-700";
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl ${toneClass}`}>{value}</p>
    </div>
  );
}
