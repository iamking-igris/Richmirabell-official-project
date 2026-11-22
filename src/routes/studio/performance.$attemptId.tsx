import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Compass,
  Loader2,
  RefreshCw,
  TrendingDown,
  Trophy,
} from "lucide-react";
import {
  assessmentsApi,
  type CbtPerformance,
  type CbtSubjectPerformance,
  type CbtTopicPerformance,
  type TopicClassification,
} from "@/lib/backend";
import { percentage, subjectLabel } from "@/lib/cbt-utils";
import { cn } from "@/lib/cn";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/studio/performance/$attemptId")({
  component: PerformancePage,
});

const CLASSIFICATION_META: Record<
  TopicClassification,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  strong: {
    label: "Strong",
    className: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  developing: {
    label: "Developing",
    className: "bg-amber-100 text-amber-900",
    icon: TrendingDown,
  },
  needs_improvement: {
    label: "Needs improvement",
    className: "bg-rose-100 text-rose-800",
    icon: TrendingDown,
  },
  not_enough_data: {
    label: "Not enough data yet",
    className: "bg-stone-200 text-stone-600",
    icon: Compass,
  },
};

function accuracyText(topic: CbtTopicPerformance): string {
  if (topic.accuracy === null || topic.attempted === 0) return "—";
  return `${Math.round(topic.accuracy * 100)}%`;
}

function PerformancePage() {
  const { attemptId } = Route.useParams();
  const [data, setData] = useState<CbtPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await assessmentsApi.cbtPerformance(attemptId);
      setData(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.details as { detail?: { message?: string } } | undefined;
        setError({
          message: body?.detail?.message || err.message,
          status: err.statusCode,
        });
      } else {
        setError({ message: err instanceof Error ? err.message : "Could not load this review." });
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load, reload]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2 font-sans">
      <Link
        to="/studio/cbt"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E]"
      >
        <ArrowLeft className="size-4" /> Back to CBT Hub
      </Link>

      <header className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1A4D2E]">
          <BarChart3 className="size-3.5" /> Performance review
        </span>
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          {data?.title || "Your examination performance"}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
          Topic-level accuracy calculated by the backend from your submitted answers — no
          question-by-question answer key, no AI-generated explanations.
        </p>
      </header>

      {loading && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-stone-200 bg-white py-16 text-center">
          <Loader2 className="size-6 animate-spin text-[#1A4D2E]" />
          <p className="text-xs text-stone-500">Reading your results from the backend…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-950">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-bold">
                {error.status === 409 ? "Not available yet" : "Could not load this review"}
              </p>
              <p>{error.message}</p>
              <div className="flex flex-wrap gap-3">
                {error.status === 409 && (
                  <Link to="/studio/cbt" className="font-bold underline">
                    Back to CBT Hub →
                  </Link>
                )}
                {error.status !== 409 && (
                  <button
                    type="button"
                    onClick={() => setReload((token) => token + 1)}
                    className="inline-flex items-center gap-1.5 font-bold underline"
                  >
                    <RefreshCw className="size-3.5" /> Try again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Totals */}
          <section className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Score
              </span>
              <strong className="font-serif text-2xl font-bold text-stone-900">
                {data.totals.correct}/{data.totals.attempted + data.totals.skipped}
              </strong>
              <span className="block text-[11px] text-stone-500">Backend-scored</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Accuracy
              </span>
              <strong className="font-serif text-2xl font-bold text-emerald-800">
                {data.totals.accuracy === null
                  ? "—"
                  : `${Math.round(data.totals.accuracy * 100)}%`}
              </strong>
              <span className="block text-[11px] text-emerald-700">Attempted questions</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Skipped
              </span>
              <strong className="font-serif text-2xl font-bold text-stone-700">
                {data.totals.skipped}
              </strong>
              <span className="block text-[11px] text-stone-500">Left unanswered</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Status
              </span>
              <strong className="font-serif text-base font-bold uppercase text-[#1A4D2E]">
                {data.status === "TIMED_OUT" ? "Timed out" : "Submitted"}
              </strong>
              <span className="block text-[11px] text-stone-500">
                {data.submitted_at
                  ? new Date(data.submitted_at).toLocaleString("en-NG")
                  : "Saved by backend"}
              </span>
            </div>
          </section>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <section className="rounded-3xl border border-[#1A4D2E]/20 bg-[#F4F7F2] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-5 text-[#1A4D2E]" />
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Where to focus your revision
                </h2>
              </div>
              <ul className="mt-4 space-y-3">
                {data.recommendations.map((rec) => (
                  <li
                    key={`${rec.subject}-${rec.topic}`}
                    className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            CLASSIFICATION_META[rec.classification].className,
                          )}
                        >
                          {CLASSIFICATION_META[rec.classification].label}
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {rec.topic}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {subjectLabel(rec.subject)} ·{" "}
                          {rec.accuracy === null
                            ? "no attempts"
                            : `${Math.round(rec.accuracy * 100)}%`}{" "}
                          ({rec.correct}/{rec.attempted})
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-stone-600">{rec.message}</p>
                    </div>
                    {rec.notes_topic_id && (
                      <Link
                        to="/studio/topic/$id"
                        params={{ id: rec.notes_topic_id }}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#1A4D2E] bg-white px-4 py-2 text-xs font-bold text-[#1A4D2E] hover:bg-[#1A4D2E]/5"
                      >
                        <BookOpen className="size-3.5" /> Study notes
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
                Recommendations are generated from your own answers only. Topics with fewer than{" "}
                {data.min_sample_size} answered questions are reported as “Not enough data yet”.
              </p>
            </section>
          )}

          {/* Subject → topic breakdown */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-[#1A4D2E]" />
                <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">
                  Subject by subject
                </h2>
              </div>
              <span className="text-xs text-stone-500">
                {data.sections.length} subjects
              </span>
            </div>

            <div className="space-y-4">
              {data.sections.map((section) => (
                <SubjectCard key={section.subject} section={section} />
              ))}
            </div>
          </section>

          <section className="flex flex-wrap gap-3">
            <Link
              to="/studio/cbt/weekly/$examId"
              params={{ examId: attemptId }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              <Trophy className="size-4" /> View result
            </Link>
            <Link
              to="/studio/progress"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              View Progress
            </Link>
            <Link
              to="/studio/cbt"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white hover:bg-[#153e25]"
            >
              <ArrowLeft className="size-4" /> Back to CBT Hub
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function SubjectCard({ section }: { section: CbtSubjectPerformance }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between gap-4 bg-stone-50 px-5 py-4 text-left"
      >
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            {section.label || subjectLabel(section.subject)}
          </h3>
          <p className="text-[11px] text-stone-500">
            {section.attempted} attempted · {section.correct} correct · {section.incorrect}{" "}
            incorrect · {section.skipped} skipped
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold text-[#1A4D2E]">
            {section.accuracy === null ? "—" : `${Math.round(section.accuracy * 100)}%`}
          </span>
          <span className="text-[11px] text-stone-500">accuracy</span>
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-stone-100">
          {section.topics.map((topic) => {
            const meta = CLASSIFICATION_META[topic.classification];
            const Icon = meta.icon;
            return (
              <div
                key={`${topic.subject}-${topic.topic}`}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">{topic.topic}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        meta.className,
                      )}
                    >
                      <Icon className="size-3" /> {meta.label}
                    </span>
                  </div>
                  {topic.subtopics.length > 0 && (
                    <p className="text-[11px] text-stone-500">
                      {topic.subtopics.slice(0, 4).join(" · ")}
                    </p>
                  )}
                  <p className="text-[11px] text-stone-500">
                    {topic.attempted} attempted · {topic.correct} correct · {topic.incorrect}{" "}
                    incorrect{topic.skipped > 0 ? ` · ${topic.skipped} skipped` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm font-bold text-stone-800">
                    {accuracyText(topic)}
                  </span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        topic.classification === "strong"
                          ? "bg-emerald-500"
                          : topic.classification === "developing"
                            ? "bg-amber-500"
                            : topic.classification === "needs_improvement"
                              ? "bg-rose-500"
                              : "bg-stone-300",
                      )}
                      style={{
                        width: `${Math.round((topic.accuracy ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                  {topic.notes_topic_id && (
                    <Link
                      to="/studio/topic/$id"
                      params={{ id: topic.notes_topic_id }}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#1A4D2E] hover:bg-stone-50"
                    >
                      <BookOpen className="size-3" /> Notes
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {section.topics.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-stone-500">
              No topic metadata was stored for this subject, so no topic analysis is shown.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
