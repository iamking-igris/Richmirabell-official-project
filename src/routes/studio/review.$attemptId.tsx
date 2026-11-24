import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assessmentsApi, type AttemptDetail, type AttemptReviewPayload } from "@/lib/backend";
import { aiRequest } from "@/services/api/ai";
import { ApiError } from "@/services/api/errors";
import { cn } from "@/lib/cn";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { TheoryQuestionView } from "@/components/TheoryQuestionView";
import { getAttemptUtmeResult } from "@/lib/utme-scoring";

export const Route = createFileRoute("/studio/review/$attemptId")({ component: ReviewPage });

type Filter = "all" | "correct" | "incorrect" | "skipped";

type ReviewItem = {
  id: string;
  prompt: string;
  options?: { key: string; text: string }[];
  answer?: string | null;
  explain?: string;
  pick?: string | null;
  correct?: boolean | null;
  status?: string;
  theory?: boolean;
  written?: string;
  modelAnswer?: string;
  markingGuide?: string;
  marks?: number | string | null;
  subjectId?: string | null;
  subject?: string | null;
};

type SavedReview = NonNullable<AttemptReviewPayload["review"]>;

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    return String(r.text ?? r.label ?? r.title ?? r.name ?? r.concept ?? r.summary ?? r.recommendation ?? r.message ?? "");
  }
  return "";
}

function normalizeSavedReview(review: SavedReview | null) {
  if (!review) return null;
  const dj = (review.diagnostic_json || {}) as Record<string, any>;
  const summary = review.summary || asText(dj.summary || dj.summaryHeadline || dj.overall);
  const strengths = (Array.isArray(review.strengths) && review.strengths.length ? review.strengths : (dj.strengths || dj.strongConcepts || []))
    .map(asText).filter(Boolean);
  const weakRaw = (Array.isArray(review.weak_areas) && review.weak_areas.length ? review.weak_areas : (dj.weak_areas || dj.weakAreas || dj.weaknesses || dj.needsWork || [])) as any[];
  const weaknesses = weakRaw.map((w) => {
    if (typeof w === "string") return { concept: "Key concept gap", theTrap: w, theReality: "", id: undefined as string | undefined };
    const concept = asText(w?.concept || w?.area || w?.topic) || "Concept misconception";
    const theTrap = asText(w?.theTrap || w?.yourMistake || w?.issue || w?.mistake || w?.why_wrong || w?.whyWrong);
    const theReality = asText(w?.theReality || w?.advice || w?.correction || w?.fix || w?.reality);
    return { concept, theTrap, theReality, id: asText(w?.id || w?.questionId || w?.question_id) || undefined };
  });
  const actionPlan = (Array.isArray(review.recommendations) && review.recommendations.length ? review.recommendations : (dj.recommendations || dj.actionPlan || dj.next_steps || dj.nextSteps || []))
    .map((x: any) => (typeof x === "string" ? x : asText(x?.text || x?.step || x?.recommendation || x))).filter(Boolean);
  const mistakes = (Array.isArray(review.mistake_diagnostics) && review.mistake_diagnostics.length ? review.mistake_diagnostics : (dj.mistake_diagnostics || dj.mistakes || [])) as any[];
  return { summary, strengths, weaknesses, actionPlan, mistakes, raw: review };
}

function itemState(item: ReviewItem): "correct" | "incorrect" | "skipped" | "answered" | "unscored" {
  const status = String(item.status || "").toLowerCase();
  if (status === "correct" || status === "incorrect" || status === "skipped" || status === "answered" || status === "unscored") {
    return status as any;
  }
  if (item.theory) {
    return item.written && item.written.trim() ? "answered" : "skipped";
  }
  if (item.pick == null || item.pick === "") return "skipped";
  if (item.answer == null || item.answer === "") return "answered";
  return item.pick === item.answer || item.correct === true ? "correct" : "incorrect";
}

function computeCounts(items: ReviewItem[], fallback?: AttemptDetail["counts"]) {
  let correct = 0, incorrect = 0, skipped = 0, answered = 0, objective = 0;
  for (const item of items) {
    const state = itemState(item);
    if (!item.theory && item.answer != null && item.answer !== "") objective += 1;
    if (state === "correct") { correct++; answered++; }
    else if (state === "incorrect") { incorrect++; answered++; }
    else if (state === "skipped") { skipped++; }
    else if (state === "answered") { answered++; }
  }
  // prefer persisted counts when they look consistent/reliable
  const fc = fallback || {};
  const persistedObjective = typeof fc.objective_total === "number" ? fc.objective_total : undefined;
  const usePersisted = typeof fc.correct === "number" || typeof fc.incorrect === "number" || typeof fc.skipped === "number";
  return {
    correct: usePersisted && typeof fc.correct === "number" ? fc.correct : correct,
    incorrect: usePersisted && typeof fc.incorrect === "number" ? fc.incorrect : incorrect,
    skipped: usePersisted && typeof fc.skipped === "number" ? fc.skipped : skipped,
    answered: typeof fc.answered === "number" ? fc.answered : answered,
    objectiveTotal: persistedObjective ?? objective,
    totalQuestions: typeof fc.total_questions === "number" ? fc.total_questions : items.length,
  };
}

function subjectLabel(value: string | null | undefined) {
  if (!value) return "Assessment";
  const key = value.toLowerCase();
  if (key === "english") return "Use of English";
  if (key === "mathematics" || key === "math") return "Mathematics";
  if (key === "physics") return "Physics";
  if (key === "chemistry") return "Chemistry";
  if (key === "biology") return "Biology";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function ReviewPage() {
  const { attemptId } = Route.useParams();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [savedReview, setSavedReview] = useState<SavedReview | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"idle" | "loading" | "generating" | "saving" | "ready" | "missing" | "failed">("idle");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await assessmentsApi.getAttempt(attemptId);
      setAttempt(detail);
      const reviewRes = await assessmentsApi.getAttemptReview(attemptId);
      if (reviewRes.review && reviewRes.review.status === "COMPLETED") {
        setSavedReview(reviewRes.review);
        setReviewStatus("ready");
      } else if (reviewRes.review && reviewRes.review.status === "FAILED") {
        setSavedReview(reviewRes.review);
        setReviewStatus("failed");
        setReviewError(reviewRes.review.error_message || "AI diagnostics could not be completed.");
      } else {
        setSavedReview(null);
        setReviewStatus("missing");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this assessment attempt.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { void load(); }, [load]);

  const items = useMemo(() => ((attempt?.items || []) as ReviewItem[]), [attempt]);
  const counts = useMemo(() => computeCounts(items, attempt?.counts), [items, attempt]);
  const displayTitle = attempt?.title || attempt?.topic_title_snapshot || attempt?.title_snapshot || "Assessment review";
  const displaySubject = attempt?.subject_label || (attempt?.subject_id ? subjectLabel(attempt.subject_id) : null);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => {
      const state = itemState(item);
      if (filter === "correct") return state === "correct";
      if (filter === "incorrect") return state === "incorrect";
      if (filter === "skipped") return state === "skipped" || (item.theory && state !== "answered");
      return true;
    });
  }, [items, filter]);

  const normalizedReview = useMemo(() => normalizeSavedReview(savedReview), [savedReview]);

  const mistakeByQuestion = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of normalizedReview?.mistakes || []) {
      if (m && typeof m === "object") {
        const id = asText((m as any).id || (m as any).questionId || (m as any).question_id);
        const text = asText((m as any).diagnosis || (m as any).analysis || (m as any).mistake || (m as any).message || (m as any).explanation || m);
        if (id && text) map.set(id, text);
      }
    }
    for (const w of normalizedReview?.weaknesses || []) {
      if (w.id && (w.theTrap || w.theReality)) {
        const existing = map.get(w.id);
        const combined = [w.theTrap ? `Mistake: ${w.theTrap}` : "", w.theReality ? `Correction: ${w.theReality}` : ""].filter(Boolean).join(" ");
        if (!existing) map.set(w.id, combined);
      }
    }
    return map;
  }, [normalizedReview]);

  const utmeAttempt = useMemo(() => attempt ? {
    id: attempt.id, topicId: attempt.topic_id || "", title: displayTitle, score: attempt.score, total: attempt.total,
    at: Date.parse(attempt.created_at) || Date.now(), kind: (attempt.kind === "jamb" ? "jamb" : attempt.kind === "waec" ? "waec" : "topic") as any,
    items: items as any, picks: attempt.picks as any, written: attempt.written as any, subjectScores: attempt.subject_scores as any,
  } : null, [attempt, items, displayTitle]);

  const utmeResult = useMemo(() => utmeAttempt ? getAttemptUtmeResult(utmeAttempt as any) : null, [utmeAttempt]);

  const generateInFlight = useRef(false);

  const generateAndSaveReview = useCallback(async (forceRetry = false) => {
    if (!attempt) return;
    if (savedReview?.status === "COMPLETED" && !forceRetry) return;
    if (generateInFlight.current) return; // never run duplicate generations concurrently
    generateInFlight.current = true;
    setReviewError(null);
    setReviewStatus("generating");
    try {
      // The backend loads the attempt from the database by ownership — only
      // the id crosses the wire, so a tampered payload can't forge answers.
      let gen: {
        ok?: boolean;
        review?: unknown;
        model?: string;
        provider?: string;
        message?: string;
      } | null = null;
      try {
        gen = await aiRequest<{
          ok: boolean;
          review?: unknown;
          model?: string;
          provider?: string;
        }>("/ai/student/review-attempt", {
          method: "POST",
          body: JSON.stringify({ attempt_id: attempt.id }),
        });
      } catch (err) {
        gen = { ok: false, message: (err as Error)?.message };
      }

      if (!gen || gen.ok === false || !gen.review) {
        const msg = gen?.message || "AI diagnostics are unavailable right now.";
        setReviewStatus("failed");
        setReviewError(msg);
        await assessmentsApi.saveAttemptReview(attempt.id, { status: "FAILED", error_message: msg, retry: forceRetry }).catch(() => undefined);
        return;
      }
      setReviewStatus("saving");
      const saved = await assessmentsApi.saveAttemptReview(attempt.id, {
        status: "COMPLETED",
        diagnostic_json: gen.review,
        model: gen.model || gen.provider || undefined,
        provider: gen.provider || undefined,
        retry: forceRetry,
      });
      setSavedReview(saved.review);
      setReviewStatus("ready");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not save AI diagnostics. Please retry.";
      setReviewStatus("failed");
      setReviewError(msg);
    } finally {
      generateInFlight.current = false;
    }
  }, [attempt, savedReview]);

  useEffect(() => {
    if (!attempt || loading) return;
    if (reviewStatus === "missing" && items.length > 0) {
      // Generate once for attempts with no saved completed review; persisted result prevents regeneration on refresh.
      void generateAndSaveReview(false);
    }
  }, [attempt, loading, reviewStatus, items.length, generateAndSaveReview]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <Loader2 className="mx-auto size-8 animate-spin text-[#1A4D2E]" />
        <p className="text-sm text-muted">Loading attempt review…</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="mx-auto max-w-md text-center py-12">
        <h1 className="font-display text-3xl text-ink">Attempt review unavailable</h1>
        <p className="mt-2 text-sm text-muted">{error || "This attempt could not be found."}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">Retry</button>
          <Link to="/studio/progress" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">View Progress</Link>
        </div>
      </div>
    );
  }

  const kindLabel = attempt.kind === "jamb" ? "JAMB CBT Exam" : attempt.kind === "waec" ? "WAEC Examination" : "Topic Quiz Assessment";
  const accuracy = counts.objectiveTotal > 0 ? ((counts.correct / counts.objectiveTotal) * 100) : (attempt.total > 0 ? (attempt.score / attempt.total) * 100 : 0);

  return (
    <div className="mx-auto max-w-3xl lg:max-w-5xl xl:max-w-6xl pb-16 space-y-6 transition-all duration-300">
      <div className="flex items-center justify-between">
        <Link to="/studio/progress" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E] hover:underline">
          <ArrowLeft className="size-4" /><span>Back to Progress</span>
        </Link>
        <span className="text-xs text-muted font-sans">
          {new Date(attempt.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="rounded-3xl border border-[#E5E0D8] bg-[#FDFBF7] p-6 lg:p-8 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-semibold uppercase tracking-wider">{kindLabel}</span>
          {displaySubject && <span className="text-xs font-medium text-muted">· {displaySubject}</span>}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#2A2422]">{displayTitle}</h1>
        <p className="text-xs sm:text-sm text-muted font-sans">Diagnostic attempt review. Original score and student responses are preserved.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-muted uppercase tracking-wider">{attempt.kind === "jamb" ? "UTME Score" : "Score"}</span>
          <p className="font-display text-3xl lg:text-4xl text-[#1A4D2E] font-bold">{attempt.kind === "jamb" && utmeResult ? `${utmeResult.utmeScore}/400` : `${attempt.score}/${attempt.total}`}</p>
          <p className="text-xs font-semibold text-primary">{accuracy.toFixed(2).replace(/\.00$/, "")}% Accuracy ({counts.correct}/{counts.objectiveTotal || attempt.total} objective)</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-emerald-800 uppercase tracking-wider">Correct</span>
          <p className="font-display text-3xl lg:text-4xl text-emerald-900">{counts.correct}</p>
          <p className="text-xs text-emerald-700">Questions mastered</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-rose-800 uppercase tracking-wider">Incorrect</span>
          <p className="font-display text-3xl lg:text-4xl text-rose-900">{counts.incorrect}</p>
          <p className="text-xs text-rose-700">Needs review</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper/60 p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-muted uppercase tracking-wider">Skipped</span>
          <p className="font-display text-3xl lg:text-4xl text-ink">{counts.skipped}</p>
          <p className="text-xs text-muted">Unanswered</p>
        </div>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-[#FCFAF7] p-6 lg:p-8 shadow-md space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1A4D2E] tracking-tight">AI Performance Diagnostics</h2>
          </div>
          <p className="text-xs text-stone-500 font-sans">Based on your actual persisted attempt responses.</p>
        </div>

        {(reviewStatus === "generating" || reviewStatus === "saving" || reviewStatus === "loading") && (
          <div className="py-6 text-center space-y-3">
            <Loader2 className="mx-auto size-7 animate-spin text-[#1A4D2E]" />
            <p className="text-xs text-muted font-sans">{reviewStatus === "saving" ? "Saving diagnostic review…" : "Analyzing your actual answers and saving diagnostics…"}</p>
          </div>
        )}

        {reviewStatus === "failed" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <div className="flex items-start gap-2 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">AI diagnostics unavailable</p>
                <p className="mt-1 text-xs">{reviewError || "The analysis could not be completed. No fabricated review is shown."}</p>
              </div>
            </div>
            <button type="button" onClick={() => void generateAndSaveReview(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#1A4D2E] px-4 text-sm font-semibold text-white">
              <RefreshCw className="size-4" /> Retry AI diagnostics
            </button>
          </div>
        )}

        {reviewStatus === "missing" && items.length === 0 && (
          <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">No question-level responses are available to analyze for this attempt.</div>
        )}

        {reviewStatus === "ready" && normalizedReview && (
          <div className="space-y-5">
            {normalizedReview.summary && (
              <div className="rounded-r-2xl rounded-l-md border-l-4 border-green-500 bg-[#F0FDF4] p-4 sm:p-5 flex items-start gap-3.5">
                <GraduationCap className="size-6 text-green-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block text-[11px] font-sans font-bold uppercase tracking-wider text-green-800">Overall assessment</span>
                  <p className="font-serif text-base sm:text-lg text-emerald-950 leading-relaxed">{normalizedReview.summary}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-green-100 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-green-800 font-bold font-sans"><CheckCircle2 className="size-5 text-green-600" /><h3>Strengths</h3></div>
                {normalizedReview.strengths.length ? <ul className="space-y-2 text-sm text-stone-800">{normalizedReview.strengths.map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 rounded-full bg-green-500 shrink-0" />{s}</li>)}</ul> : <p className="text-sm text-muted">No clear strengths identified from the recorded responses.</p>}
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold font-sans"><AlertTriangle className="size-5 text-amber-600" /><h3>Weak areas</h3></div>
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {normalizedReview.weaknesses.length ? normalizedReview.weaknesses.map((w, i) => (
                    <div key={i} className="rounded-xl border border-amber-200/70 bg-stone-50/60 p-3 space-y-2">
                      <p className="font-semibold text-amber-950 text-sm">{w.concept}</p>
                      {w.theTrap && <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-900"><span className="font-semibold">Mistake: </span>{w.theTrap}</div>}
                      {w.theReality && <div className="rounded-lg bg-white border border-stone-200 p-2 text-xs text-stone-800"><span className="font-semibold">Correction: </span>{w.theReality}</div>}
                    </div>
                  )) : <p className="text-sm text-muted">No specific weak areas were identified from the recorded incorrect or skipped answers.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-800 font-bold font-sans"><Target className="size-5 text-blue-600" /><h3>Next steps</h3></div>
                {normalizedReview.actionPlan.length ? <ul className="space-y-2 text-sm text-slate-800">{normalizedReview.actionPlan.map((s: string, i: number) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 text-green-600 shrink-0" /><span>{typeof s === "string" ? s : asText(s)}</span></li>)}</ul> : <p className="text-sm text-muted">Review the explanations below and revisit the related lesson notes.</p>}
              </div>
            </div>
            {savedReview && (
              <p className="text-[11px] text-muted">Saved review · version {savedReview.version} · {savedReview.updated_at || savedReview.created_at ? new Date(savedReview.updated_at || savedReview.created_at).toLocaleString() : ""}</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">Question-by-Question Review</h2>
            <p className="text-xs text-muted font-sans">Original attempt questions, your responses, correct answers, explanations, and diagnostics.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { key: "all", label: `All (${counts.totalQuestions})` },
              { key: "correct", label: `Correct (${counts.correct})` },
              { key: "incorrect", label: `Incorrect (${counts.incorrect})` },
              { key: "skipped", label: `Skipped (${counts.skipped})` },
            ] as const).map((f) => (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-all", filter === f.key ? "bg-[#1A4D2E] text-white shadow-2xs" : "bg-surface border border-line text-muted hover:text-ink")}>{f.label}</button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-2"><AlertCircle className="size-4" />No question-level records are available for this attempt.</p>
            <p className="text-xs text-amber-800">The score is preserved, but the original question-and-answer snapshot could not be reconstructed from stored data.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-8 text-center text-xs text-muted">No questions match the "{filter}" filter.</div>
        ) : (
          <ul className="space-y-4">
            {filteredItems.map((item, i) => {
              const originalIndex = items.findIndex((it) => it.id === item.id);
              const qNum = originalIndex >= 0 ? originalIndex + 1 : i + 1;
              const state = itemState(item);
              const diagnostic = mistakeByQuestion.get(item.id);

              if (item.theory) {
                return (
                  <li key={item.id} className="rounded-3xl border border-line bg-surface p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-[#1A4D2E] text-white text-xs font-bold flex items-center justify-center">{qNum}</span>
                        <span className="font-serif font-bold text-sm text-[#2A2422]">Theory Question {qNum}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", state === "skipped" ? "bg-gray-100 text-gray-700 border-gray-300" : "bg-purple-100 text-purple-800 border-purple-200")}>{state === "skipped" ? "Skipped" : "Answered"}</span>
                      </div>
                    </div>
                    <TheoryQuestionView question={item as any} index={qNum - 1} showAnswers={true} />
                    <div className="rounded-2xl border border-line bg-paper/60 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Your submitted response</span>
                      <p className="text-xs text-ink whitespace-pre-wrap font-sans">{item.written?.trim() || "No response written."}</p>
                    </div>
                    {item.modelAnswer && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
                        <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Model answer</span>
                        <p className="text-xs text-emerald-950 whitespace-pre-wrap font-sans">{item.modelAnswer}</p>
                      </div>
                    )}
                    {item.markingGuide && (
                      <div className="rounded-2xl border border-line bg-white p-3.5 space-y-1">
                        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Marking guide</span>
                        <p className="text-xs text-ink whitespace-pre-wrap font-sans">{item.markingGuide}</p>
                      </div>
                    )}
                    {diagnostic && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900"><span className="font-bold">AI feedback: </span>{diagnostic}</div>
                    )}
                  </li>
                );
              }

              const isCorrect = state === "correct";
              const isSkipped = state === "skipped";
              const options = item.options || [];
              return (
                <li key={item.id} className={cn("rounded-3xl border p-5 shadow-xs space-y-3.5", isCorrect ? "border-emerald-200 bg-white" : isSkipped ? "border-line bg-paper/40" : "border-rose-200 bg-white")}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-full bg-[#1A4D2E] text-white text-xs font-bold flex items-center justify-center">{qNum}</span>
                      <span className="font-serif font-bold text-sm text-[#2A2422]">Question {qNum}</span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1", isCorrect ? "bg-emerald-100 text-emerald-800 border-emerald-300" : isSkipped ? "bg-gray-100 text-gray-700 border-gray-300" : "bg-rose-100 text-rose-800 border-rose-300")}>
                        {isCorrect ? <><Check className="size-3" /> Correct</> : isSkipped ? "Skipped" : <><X className="size-3" /> Incorrect</>}
                      </span>
                    </div>
                    <span className="text-xs text-muted font-sans">Your choice: <strong>{item.pick || "None"}</strong> · Correct: <strong>{item.answer || "N/A"}</strong></span>
                  </div>
                  <div className="text-sm font-medium text-ink leading-relaxed"><InlineMathText text={item.prompt || "(Question text unavailable)"} /></div>
                  {options.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      {options.map((opt) => {
                        const isPick = item.pick === opt.key;
                        const isAns = item.answer === opt.key;
                        return (
                          <div key={opt.key} className={cn("flex items-start gap-2.5 rounded-2xl border p-2.5 text-xs", isAns ? "border-emerald-300 bg-emerald-50 text-emerald-950" : isPick ? "border-rose-300 bg-rose-50 text-rose-950" : "border-line bg-surface text-ink")}>
                            <span className={cn("size-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5", isAns ? "bg-emerald-600 text-white" : isPick ? "bg-rose-600 text-white" : "bg-line text-muted")}>{opt.key}</span>
                            <div className="leading-snug">
                              <InlineMathText text={opt.text} />
                              {isAns && <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">Correct answer</span>}
                              {!isAns && isPick && <span className="block text-[10px] text-rose-700 font-semibold mt-0.5">Your choice</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {item.explain && (
                    <div className="rounded-2xl border border-line bg-paper/70 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Explanation / working</span>
                      <div className="text-xs text-ink leading-relaxed font-sans"><InlineMathText text={item.explain} /></div>
                    </div>
                  )}
                  {!isCorrect && diagnostic && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-950"><span className="font-bold">AI mistake diagnosis: </span>{diagnostic}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <Link to="/studio/progress" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper">← Return to Progress</Link>
        {attempt.topic_id && (
          <Link to="/studio/topic/$id" params={{ id: attempt.topic_id }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-5 text-sm font-semibold text-white hover:bg-[#153e25] transition-colors">Study Topic Note →</Link>
        )}
      </div>
    </div>
  );
}
