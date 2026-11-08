import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  X,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  GraduationCap,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Choice } from "@/data/catalog";
import { keyLabel } from "@/lib/assessment";
import { findAttempt, useSession } from "@/lib/session";
import { getAttemptUtmeResult } from "@/lib/utme-scoring";
import { cn } from "@/lib/cn";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { TheoryQuestionView } from "@/components/TheoryQuestionView";

export const Route = createFileRoute("/studio/review/$attemptId")({ component: ReviewPage });

interface WeaknessItem {
  id?: string;
  concept?: string;
  theTrap?: string;
  yourMistake?: string;
  theReality?: string;
  issue?: string;
  advice?: string;
}

interface AiAttemptReview {
  summary?: string;
  summaryHeadline?: string;
  strengths?: string[];
  strongConcepts?: string[];
  weaknesses?: (WeaknessItem | string)[];
  needsWork?: { concept: string; issue: string; advice: string }[];
  actionPlan?: string[];
  polishAdvice?: string[];
}

interface NormalizedWeakness {
  id?: string;
  concept: string;
  theTrap: string;
  theReality: string;
}

interface NormalizedAiReview {
  summary: string;
  strengths: string[];
  weaknesses: NormalizedWeakness[];
  actionPlan: string[];
}

function normalizeAiReview(raw: any): NormalizedAiReview | null {
  if (!raw) return null;

  const summary = raw.summary || raw.summaryHeadline || "";

  const strengths: string[] = Array.isArray(raw.strengths)
    ? raw.strengths
    : Array.isArray(raw.strongConcepts)
    ? raw.strongConcepts
    : [];

  const rawWeaknesses = Array.isArray(raw.weaknesses)
    ? raw.weaknesses
    : Array.isArray(raw.needsWork)
    ? raw.needsWork
    : [];

  const weaknesses: NormalizedWeakness[] = rawWeaknesses.map((w: any) => {
    if (typeof w === "string") {
      return {
        concept: "Key Concept Gap",
        theTrap: w,
        theReality: "",
      };
    }
    const concept = w.concept || "Concept Misconception";
    const theTrap = w.theTrap || w.yourMistake || w.issue || "";
    const theReality = w.theReality || w.advice || "";
    return {
      id: w.id,
      concept,
      theTrap,
      theReality,
    };
  });

  const actionPlan: string[] = Array.isArray(raw.actionPlan)
    ? raw.actionPlan
    : Array.isArray(raw.polishAdvice)
    ? raw.polishAdvice
    : [];

  return {
    summary,
    strengths,
    weaknesses,
    actionPlan,
  };
}

function computeMetrics(attempt: any) {
  const items = attempt.items || [];
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.theory) {
      if (!item.written || !item.written.trim()) skipped++;
    } else {
      if (!item.pick) {
        skipped++;
      } else if (item.answer != null && item.pick === item.answer) {
        correct++;
      } else {
        incorrect++;
      }
    }
  }

  const objTotal = items.filter((it: any) => !it.theory).length;
  const pct = objTotal > 0 ? Math.round((correct / objTotal) * 100) : 0;

  return { correct, incorrect, skipped, objTotal, pct };
}

function getDeterministicClientFallback(attempt: any, metrics: any) {
  const incorrectQuestions = (attempt.items || []).filter(
    (it: any) => !it.theory && it.answer != null && it.pick && it.pick !== it.answer
  );
  const sampleWeaknesses = incorrectQuestions.slice(0, 3).map((it: any) => ({
    id: it.id,
    concept: it.subject ? `${it.subject} Question Review` : "Question Review",
    theTrap: `Selected option (${it.pick}) does not satisfy question constraints.`,
    theReality: it.explain || `Official key is (${it.answer}). Review core principles and definitions.`,
  }));

  return {
    summary:
      metrics.pct >= 75
        ? `Strong performance (${metrics.pct}%). Reinforce key definitions and practice timed calculations.`
        : metrics.pct >= 50
        ? `Solid foundation (${metrics.pct}%). Systematic review of skipped and incorrect concepts will elevate score to 75%+.`
        : `Diagnostic indicates foundational concepts require focused review. Target missed syllabus topics and retake the paper.`,
    strengths: [
      `Mastered ${metrics.correct} questions across tested sections.`,
      "Maintained examination focus through multiple subject papers.",
    ],
    weaknesses: sampleWeaknesses.length > 0 ? sampleWeaknesses : [
      {
        concept: "Syllabus Timing & Accuracy",
        theTrap: "Skipping questions under time pressure or hasty calculations.",
        theReality: "Budget 40 seconds per multiple-choice question to review each option carefully.",
      }
    ],
    actionPlan: [
      "Review worked step-by-step explanations for all incorrect answers below.",
      "Read corresponding Topic Study Notes in the Syllabus Library.",
      "Sit another timed practice session to build speed and accuracy under pressure.",
    ],
  };
}

function ReviewPage() {
  const { attemptId } = Route.useParams();
  const attempts = useSession((s) => s.attempts);
  const attempt = findAttempt(attempts, attemptId);

  const [filter, setFilter] = useState<"all" | "incorrect" | "correct" | "skipped">("all");
  const [aiReview, setAiReview] = useState<AiAttemptReview | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!attempt) return { correct: 0, incorrect: 0, skipped: 0, objTotal: 0, pct: 0 };
    return computeMetrics(attempt);
  }, [attempt]);

  const subjectStats = useMemo(() => {
    if (!attempt || !attempt.items?.length) return [];
    const groups: Record<string, { label: string; correct: number; total: number; questions: any[] }> = {};

    for (const it of attempt.items) {
      const rawSub = (it as any).subjectId || (it as any).subject || (attempt.subjectLabel || "general");
      const subKey = String(rawSub).toLowerCase();

      let label = (it as any).subject || "";
      if (!label || label === "General") {
        if (subKey === "english") label = "Use of English";
        else if (subKey === "mathematics" || subKey === "math") label = "Mathematics";
        else if (subKey === "physics") label = "Physics";
        else if (subKey === "chemistry") label = "Chemistry";
        else if (subKey === "biology") label = "Biology";
        else label = subKey.charAt(0).toUpperCase() + subKey.slice(1);
      }

      if (!groups[subKey]) {
        groups[subKey] = { label, correct: 0, total: 0, questions: [] };
      }
      groups[subKey].total += 1;
      groups[subKey].questions.push(it);
      if (it.answer != null && it.pick === it.answer) {
        groups[subKey].correct += 1;
      }
    }

    const list = Object.entries(groups).map(([key, val]) => {
      const pct = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
      return { key, label: val.label, correct: val.correct, total: val.total, pct };
    });

    if (list.length <= 1) {
      return list.map((s) => ({ ...s, isStrongest: false, isWeakest: false }));
    }

    let maxPct = -1;
    let minPct = 101;
    for (const s of list) {
      if (s.pct > maxPct) maxPct = s.pct;
      if (s.pct < minPct) minPct = s.pct;
    }

    return list.map((s) => ({
      ...s,
      isStrongest: list.length > 1 && s.pct === maxPct && maxPct > 0,
      isWeakest: list.length > 1 && s.pct === minPct && (minPct < maxPct || minPct < 50),
    }));
  }, [attempt]);

  const isPerfectScore = metrics.objTotal > 0 && metrics.incorrect === 0 && metrics.skipped === 0;

  // Request AI Attempt Diagnostic Review
  useEffect(() => {
    if (!attempt || !attempt.items?.length) return;

    if (isPerfectScore) {
      setAiReview({
        summary: "Outstanding performance! You achieved a perfect score with complete mastery across all tested concepts.",
        strengths: ["Comprehensive conceptual mastery demonstrated across all questions."],
        weaknesses: [],
        actionPlan: ["Maintain your consistency and proceed to the next curriculum unit or attempt a full timed past paper."],
      });
      setLoadingAi(false);
      return;
    }

    const cacheKey = `ai_review_${attempt.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAiReview(JSON.parse(cached));
        return;
      } catch {}
    }

    let active = true;
    setLoadingAi(true);
    setAiError(null);

    fetch("/api/student/review-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.ok && data.review) {
          setAiReview(data.review);
          sessionStorage.setItem(cacheKey, JSON.stringify(data.review));
        } else {
          // Graceful fallback to deterministic analysis
          const fallback = getDeterministicClientFallback(attempt, metrics);
          setAiReview(fallback);
        }
      })
      .catch(() => {
        if (!active) return;
        // Graceful fallback to deterministic analysis
        const fallback = getDeterministicClientFallback(attempt, metrics);
        setAiReview(fallback);
      })
      .finally(() => {
        if (active) setLoadingAi(false);
      });

    return () => {
      active = false;
    };
  }, [attempt, isPerfectScore, metrics]);

  if (!attempt) {
    return (
      <div className="mx-auto max-w-md text-center py-12">
        <h1 className="font-display text-3xl text-ink">Attempt not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been cleared or never saved on this device.</p>
        <Link
          to="/studio/progress"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
        >
          View Progress
        </Link>
      </div>
    );
  }

  const kindLabel =
    attempt.kind === "jamb"
      ? "JAMB CBT Exam"
      : attempt.kind === "waec"
      ? "WAEC Examination"
      : "Topic Quiz Assessment";

  const items = attempt.items || [];

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (item.theory) {
      const isSkipped = !item.written || !item.written.trim();
      if (filter === "skipped") return isSkipped;
      return !isSkipped;
    }
    const isCorrect = item.answer != null && item.pick === item.answer;
    const isSkipped = !item.pick;
    if (filter === "correct") return isCorrect;
    if (filter === "incorrect") return !isCorrect && !isSkipped;
    if (filter === "skipped") return isSkipped;
    return true;
  });

  const normalizedReview = useMemo(() => {
    return normalizeAiReview(aiReview);
  }, [aiReview]);

  const itemAnalysisMap = useMemo(() => {
    const map = new Map<string, { mistakeAnalysis?: string; missingPoints?: string[] }>();
    if (normalizedReview?.weaknesses) {
      for (const w of normalizedReview.weaknesses) {
        if (w.id) {
          const trapText = w.theTrap ? `Your Mistake: ${w.theTrap}` : "";
          const realityText = w.theReality ? `The Reality: ${w.theReality}` : "";
          const combined = [trapText, realityText].filter(Boolean).join(" · ");
          map.set(w.id, {
            mistakeAnalysis: combined || "Misconception diagnosed by AI tutor.",
            missingPoints: w.theReality ? [w.theReality] : [],
          });
        }
      }
    }
    return map;
  }, [normalizedReview]);

  const utmeResult = useMemo(() => {
    return getAttemptUtmeResult(attempt);
  }, [attempt]);

  return (
    <div className="mx-auto max-w-3xl lg:max-w-5xl xl:max-w-6xl pb-16 space-y-6 transition-all duration-300">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/studio/progress"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E] hover:underline"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Progress</span>
        </Link>
        <span className="text-xs text-muted font-sans">
          {new Date(attempt.at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Hero Header */}
      <div className="rounded-3xl border border-[#E5E0D8] bg-[#FDFBF7] p-6 lg:p-8 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-semibold uppercase tracking-wider">
            {kindLabel}
          </span>
          {attempt.subjectLabel && (
            <span className="text-xs font-medium text-muted">· {attempt.subjectLabel}</span>
          )}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#2A2422]">
          {attempt.title}
        </h1>
        <p className="text-xs sm:text-sm text-muted font-sans">
          Diagnostic attempt review. Original score and student responses are preserved and cannot be altered.
        </p>
      </div>

      {/* Metrics Scoreboard Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-muted uppercase tracking-wider">
            {attempt.kind === "jamb" ? "UTME Score" : "Score"}
          </span>
          <p className="font-display text-3xl lg:text-4xl text-[#1A4D2E] font-bold">
            {attempt.kind === "jamb" ? `${utmeResult.utmeScore}/400` : `${attempt.score}/${attempt.total}`}
          </p>
          <p className="text-xs font-semibold text-primary">{utmeResult.accuracy}% Accuracy ({utmeResult.rawCorrect}/{utmeResult.rawTotal} Qs)</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-emerald-800 uppercase tracking-wider">Correct</span>
          <p className="font-display text-3xl lg:text-4xl text-emerald-900">{metrics.correct}</p>
          <p className="text-xs text-emerald-700">Questions Mastered</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-rose-800 uppercase tracking-wider">Incorrect</span>
          <p className="font-display text-3xl lg:text-4xl text-rose-900">{metrics.incorrect}</p>
          <p className="text-xs text-rose-700">Needs Review</p>
        </div>

        <div className="rounded-2xl border border-line bg-paper/60 p-4 lg:p-5 text-center space-y-1">
          <span className="text-[11px] lg:text-xs font-semibold text-muted uppercase tracking-wider">Skipped</span>
          <p className="font-display text-3xl lg:text-4xl text-ink">{metrics.skipped}</p>
          <p className="text-xs text-muted">Unanswered</p>
        </div>
      </div>

      {/* Subject-by-Subject Score Breakdown (Section 8) */}
      {subjectStats.length > 0 && (
        <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 lg:p-7 shadow-xs space-y-4 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#2A2422]">Subject UTME Breakdown</h2>
              <p className="text-xs text-stone-500 font-sans">
                Detailed scores out of 100 max per subject and accuracy across your examination sections.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#1A4D2E] bg-[#1A4D2E]/10 px-3 py-1 rounded-full">
              {subjectStats.length} {subjectStats.length === 1 ? "Subject" : "Subjects"} Tested
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {subjectStats.map((sub) => {
              const sbDetail = utmeResult.subjectBreakdown[sub.key];
              const subUtmeScore = sbDetail ? sbDetail.utmeScore : Math.round(sub.pct);

              return (
                <div
                  key={sub.key}
                  className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-stone-900 leading-snug">{sub.label}</h3>
                      <span className="text-xs text-stone-500 font-sans font-medium">
                        {sub.correct} / {sub.total} Correct
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-[#1A4D2E] block">
                        {subUtmeScore} / 100
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium block">UTME Marks</span>
                    </div>
                  </div>

                  {/* Percentage bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          sub.pct >= 70 ? "bg-emerald-600" : sub.pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${Math.max(4, sub.pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Strongest / Weakest Section Badges */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {sub.isStrongest && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ★ Strongest Section
                      </span>
                    )}
                    {sub.isWeakest && (
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ⚠️ Needs Attention
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Performance Breakdown Section - Premium Redesign */}
      <section className="rounded-3xl border border-gray-100 bg-[#FCFAF7] p-6 lg:p-8 shadow-md space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1A4D2E] tracking-tight">
              AI Performance Diagnostics
            </h2>
          </div>
          <p className="text-xs text-stone-500 font-sans hidden sm:block">
            Hyper-specific diagnostic feedback based on your actual mistakes.
          </p>
        </div>

        {isPerfectScore ? (
          /* Fallback State: Celebratory Perfect Score UI */
          <div className="rounded-2xl border border-emerald-200 bg-[#F0FDF4] p-8 text-center space-y-3">
            <div className="size-16 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="size-10" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-emerald-950">
                Perfect Score! 100% Mastery
              </h3>
              <p className="mt-1 text-sm font-sans text-emerald-800 max-w-lg mx-auto">
                Outstanding performance! You answered every question correctly with zero misconceptions or skipped questions.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-700/10 px-4 py-1.5 text-xs font-semibold text-emerald-900 font-sans">
              <span>★ Flawless accuracy across all tested syllabus concepts</span>
            </div>
          </div>
        ) : loadingAi ? (
          <div className="py-8 text-center space-y-3">
            <div className="size-8 border-3 border-[#1A4D2E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted font-medium font-sans">
              Diagnosing concept misconceptions, common traps, and solution steps from your mistakes...
            </p>
          </div>
        ) : normalizedReview ? (
          <div className="space-y-6">
            {/* The Summary (Hero Section: Tutor's Note) */}
            {normalizedReview.summary && (
              <div className="rounded-r-2xl rounded-l-md border-l-4 border-green-500 bg-[#F0FDF4] p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                <GraduationCap className="size-6 text-green-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block text-[11px] font-sans font-bold uppercase tracking-wider text-green-800">
                    Tutor's Note
                  </span>
                  <p className="font-serif text-base sm:text-lg text-emerald-950 leading-relaxed italic">
                    “{normalizedReview.summary}”
                  </p>
                </div>
              </div>
            )}

            {/* The 3-Column Layout (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Strong Concepts (The Wins) */}
              <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-2xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-green-800 font-bold font-sans text-base mb-3.5">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                    <h3 className="font-bold">Strong Concepts</h3>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm font-sans text-stone-800">
                    {normalizedReview.strengths && normalizedReview.strengths.length > 0 ? (
                      normalizedReview.strengths.map((sc, i) => (
                        <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="size-2 rounded-full bg-green-500 shrink-0 mt-1.5" />
                          <span>{sc}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted italic">Review needed across tested curriculum topics.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Column 2: Needs Work (The Fixes - Highly Readable & Scrollable) */}
              <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-2xs space-y-3 flex flex-col">
                <div className="flex items-center justify-between gap-2 text-amber-800 font-bold font-sans text-base mb-2 border-b border-amber-100/70 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                    <h3 className="font-bold">Needs Work</h3>
                  </div>
                  {normalizedReview.weaknesses && normalizedReview.weaknesses.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                      {normalizedReview.weaknesses.length} {normalizedReview.weaknesses.length === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3.5 font-sans max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {normalizedReview.weaknesses && normalizedReview.weaknesses.length > 0 ? (
                    normalizedReview.weaknesses.map((w, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-amber-200/60 bg-stone-50/60 p-3.5 space-y-2.5"
                      >
                        <p className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5 leading-snug">
                          <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                          <span>{w.concept}</span>
                        </p>
                        {w.theTrap && (
                          <div className="rounded-lg bg-rose-50 border border-rose-200/80 p-2.5 text-rose-950 space-y-1">
                            <span className="font-bold text-xs uppercase tracking-wider text-rose-800 block">
                              Your Mistake / Trap:
                            </span>
                            <p className="leading-relaxed text-xs sm:text-sm font-medium">{w.theTrap}</p>
                          </div>
                        )}
                        {w.theReality && (
                          <div className="rounded-lg bg-white border border-stone-200/90 p-2.5 text-stone-800 space-y-1">
                            <span className="font-bold text-xs uppercase tracking-wider text-stone-700 block">
                              The Reality:
                            </span>
                            <p className="leading-relaxed text-xs sm:text-sm font-normal">{w.theReality}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-xs italic">Clean sweep! No misconceptions detected.</p>
                  )}
                </div>
              </div>

              {/* Column 3: Targeted Next Steps (The Action Plan) */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-blue-800 font-bold font-sans text-base mb-3.5">
                  <Target className="size-5 text-blue-600 shrink-0" />
                  <h3 className="font-bold">Targeted Next Steps</h3>
                </div>
                <ul className="space-y-3.5 font-sans">
                  {normalizedReview.actionPlan && normalizedReview.actionPlan.length > 0 ? (
                    normalizedReview.actionPlan.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed">
                        <CheckCircle2 className="size-4.5 text-green-600 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted text-xs italic">Ready to proceed to the next syllabus module.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted font-sans italic">
            {aiError || "Diagnostic review generated automatically based on completed answers."}
          </p>
        )}
      </section>

      {/* Question-by-Question Review Header & Filters */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">
              Question-by-Question Review
            </h2>
            <p className="text-xs text-muted font-sans">
              Examine student choices, correct answers, formulas, and AI mistake diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { key: "all", label: `All (${items.length})` },
                { key: "incorrect", label: `Incorrect (${metrics.incorrect})` },
                { key: "correct", label: `Correct (${metrics.correct})` },
                { key: "skipped", label: `Skipped (${metrics.skipped})` },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  filter === f.key
                    ? "bg-[#1A4D2E] text-white shadow-2xs"
                    : "bg-surface border border-line text-muted hover:text-ink"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-8 text-center text-xs text-muted">
            No questions match the "{filter}" filter.
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredItems.map((item, i) => {
              const originalIndex = items.findIndex((it) => it.id === item.id);
              const qNum = originalIndex >= 0 ? originalIndex + 1 : i + 1;
              const diagnostic = itemAnalysisMap.get(item.id);

              if (item.theory) {
                const answered = Boolean(item.written && item.written.trim());
                return (
                  <li
                    key={item.id}
                    className="rounded-3xl border border-line bg-surface p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-[#1A4D2E] text-white text-xs font-bold flex items-center justify-center">
                          {qNum}
                        </span>
                        <span className="font-serif font-bold text-sm text-[#2A2422]">
                          Theory Question {qNum}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          Written Theory
                        </span>
                      </div>
                      <span className="text-xs text-muted font-medium">
                        {answered ? "Submitted" : "Skipped"}
                      </span>
                    </div>

                    {/* Hierarchical theory question, diagram SVG, model answer and tutor explanation */}
                    <TheoryQuestionView
                      question={item}
                      index={qNum - 1}
                      showAnswers={true}
                    />

                    {/* Student's written answer */}
                    <div className="rounded-2xl border border-line bg-paper/60 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Your Submitted Response:
                      </span>
                      <p className="text-xs text-ink whitespace-pre-wrap font-sans">
                        {item.written?.trim() || "No response written."}
                      </p>
                    </div>

                    {/* Missing points diagnostic if present */}
                    {diagnostic?.missingPoints && diagnostic.missingPoints.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 space-y-1">
                        <span className="font-bold text-amber-800">Key Points to Include:</span>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {diagnostic.missingPoints.map((mp, k) => (
                            <li key={k}>{mp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              }

              // Multiple Choice Question Review
              const isCorrect = item.answer != null && item.pick === item.answer;
              const isSkipped = !item.pick;

              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-3xl border p-5 shadow-xs space-y-3.5 transition-all",
                    isCorrect
                      ? "border-emerald-200 bg-white"
                      : isSkipped
                      ? "border-line bg-paper/40"
                      : "border-rose-200 bg-white"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-full bg-[#1A4D2E] text-white text-xs font-bold flex items-center justify-center">
                        {qNum}
                      </span>
                      <span className="font-serif font-bold text-sm text-[#2A2422]">
                        Question {qNum}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1",
                          isCorrect
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : isSkipped
                            ? "bg-gray-100 text-gray-700 border-gray-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        )}
                      >
                        {isCorrect ? (
                          <>
                            <Check className="size-3" /> Correct
                          </>
                        ) : isSkipped ? (
                          "Skipped"
                        ) : (
                          <>
                            <X className="size-3" /> Incorrect
                          </>
                        )}
                      </span>
                    </div>

                    <span className="text-xs text-muted font-sans">
                      Your Choice: <strong>{item.pick || "None"}</strong> · Key:{" "}
                      <strong>{item.answer || "N/A"}</strong>
                    </span>
                  </div>

                  {/* Question Prompt with KaTeX math rendering */}
                  <div className="text-sm font-medium text-ink leading-relaxed">
                    <InlineMathText text={item.prompt} />
                  </div>

                  {/* Options List */}
                  {item.options && item.options.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      {item.options.map((opt) => {
                        const isStudentPick = item.pick === opt.key;
                        const isCorrectOption = item.answer === opt.key;

                        return (
                          <div
                            key={opt.key}
                            className={cn(
                              "flex items-start gap-2.5 rounded-2xl border p-2.5 text-xs transition-colors",
                              isCorrectOption
                                ? "border-emerald-300 bg-emerald-50 text-emerald-950 font-medium"
                                : isStudentPick
                                ? "border-rose-300 bg-rose-50 text-rose-950"
                                : "border-line bg-surface text-ink"
                            )}
                          >
                            <span
                              className={cn(
                                "size-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5",
                                isCorrectOption
                                  ? "bg-emerald-600 text-white"
                                  : isStudentPick
                                  ? "bg-rose-600 text-white"
                                  : "bg-line text-muted"
                              )}
                            >
                              {opt.key}
                            </span>
                            <div className="leading-snug">
                              <InlineMathText text={opt.text} />
                              {isCorrectOption && (
                                <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                                  ✓ Correct Option
                                </span>
                              )}
                              {!isCorrectOption && isStudentPick && (
                                <span className="block text-[10px] text-rose-700 font-semibold mt-0.5">
                                  ✕ Your Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AI Explanation / Worked steps */}
                  {item.explain && (
                    <div className="rounded-2xl border border-line bg-paper/70 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Educational Explanation & Working:
                      </span>
                      <div className="text-xs text-ink leading-relaxed font-sans">
                        <InlineMathText text={item.explain} />
                      </div>
                    </div>
                  )}

                  {/* AI Mistake Misconception Diagnostic for incorrect questions */}
                  {!isCorrect && diagnostic?.mistakeAnalysis && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                      <span className="font-bold text-amber-800 shrink-0">💡 Common Misconception:</span>
                      <p>{diagnostic.mistakeAnalysis}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Bottom Sticky Action Footer */}
      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/studio/progress"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper"
        >
          ← Return to Progress
        </Link>
        {attempt.topicId && (
          <Link
            to="/studio/topic/$id"
            params={{ id: attempt.topicId }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-5 text-sm font-semibold text-white hover:bg-[#153e25] transition-colors"
          >
            Study Topic Note →
          </Link>
        )}
      </div>
    </div>
  );
}
