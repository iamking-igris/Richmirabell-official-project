import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Choice } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { useSession } from "@/lib/session";
import { assessmentsApi, type QuizSubmitResponse } from "@/lib/backend";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { TheoryQuestionView } from "@/components/TheoryQuestionView";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/studio/practice/$id")({ component: PracticePage });

const KEYS: Choice[] = ["A", "B", "C", "D"];

function verdict(score: number, total: number) {
  const ratio = score / Math.max(total, 1);
  if (total === 0) return "Written answers saved.";
  if (ratio === 1) return "Clean sweep.";
  if (ratio >= 0.75) return "Strong. One to review.";
  if (ratio >= 0.5) return "Half there. Read the note again.";
  return "Start with the note, then try again.";
}

function PracticePage() {
  const { id } = Route.useParams();
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const loading = useContent((s) => s.loading);
  const contentError = useContent((s) => s.error);
  const found = locateTopic(subjects, id);
  const access = useSession((s) => s.access);
  const open = access ? access.has_access : true;
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Choice>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"mcq" | "theory">("mcq");
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const questions = found?.topic.questions ?? [];
  const theory = found?.topic.theory ?? [];
  const total = questions.length;
  const answered = useMemo(
    () => questions.filter((question) => Boolean(picks[question.id])).length,
    [questions, picks],
  );

  useEffect(() => {
    if (!found || done || !open || phase !== "mcq") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const key = event.key.toUpperCase();
      const number = Number(event.key);
      const choice = KEYS.includes(key as Choice)
        ? (key as Choice)
        : number >= 1 && number <= 4
          ? KEYS[number - 1]
          : null;
      if (choice && questions[index]) {
        setPicks((current) => ({ ...current, [questions[index].id]: choice }));
      } else if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, questions.length - 1));
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [found, index, done, open, phase, questions]);

  if (!found) {
    if (loading) {
      return (
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl">Loading practice set…</h1>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">
          {contentError ? "Could not load this practice set" : "That set is not on Richmirabel"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {contentError || "The topic may not be published yet, or the link is out of date."}
        </p>
        <Link
          to="/studio/subjects"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
        >
          Back to subjects
        </Link>
      </div>
    );
  }

  const { subject, topic } = found;

  if (!open) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6">
        <h1 className="font-display text-3xl">Your free days are over.</h1>
        <p className="mt-2 text-muted">Practice needs a plan. Notes stay open.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/studio/plan"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg"
          >
            See plan
          </Link>
          <Link
            to="/studio/topic/$id"
            params={{ id: topic.id }}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold"
          >
            Back to the note
          </Link>
        </div>
      </div>
    );
  }

  if (total === 0 && theory.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6">
        <h1 className="font-display text-3xl">No practice questions yet.</h1>
        <p className="mt-2 text-muted">
          This lesson has been published, but the question bank for it is still empty.
        </p>
        <Link
          to="/studio/topic/$id"
          params={{ id: topic.id }}
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg"
        >
          Back to the note
        </Link>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await assessmentsApi.submitQuiz(topic.id, picks, written);
      setResult(response);
      setConfirming(false);
      setDone(true);
      void useSession.getState().refreshProgress();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.statusCode === 402
            ? "Practice requires an active subscription. Visit your plan to renew access."
            : err.message
          : "Could not submit this attempt. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done && result) {
    const at = subject.topics.findIndex((item) => item.id === topic.id);
    const next = subject.topics[at + 1];
    const resultsById = new Map(result.results.map((item) => [item.id, item]));
    return (
      <div className="mx-auto max-w-2xl pb-8">
        <p className="text-sm text-primary">
          {subject.name} · {topic.title}
        </p>
        <h1 className="mt-1 font-display text-6xl">
          {result.score}/{result.total}
        </h1>
        <p className="mt-1 text-lg">{verdict(result.score, result.total)}</p>
        <p className="mt-1 text-sm text-muted">
          Objective score only. Written answers are saved, not formally marked.
        </p>

        {result.id && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1A4D2E]/20 bg-[#FDFBF7] p-4 shadow-2xs">
            <div>
              <p className="font-serif text-base font-bold text-[#1A4D2E]">
                Review this attempt question by question
              </p>
              <p className="font-sans text-xs text-[#6B6B6B]">
                See the correct answer and explanation returned by the server.
              </p>
            </div>
            <Link
              to="/studio/review/$attemptId"
              params={{ attemptId: result.id }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1A4D2E] px-5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#153e25]"
            >
              <span>Review attempt</span>
              <span>→</span>
            </Link>
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {questions.map((question, i) => {
            const item = resultsById.get(question.id);
            const pick = item?.pick ?? picks[question.id];
            const correct = Boolean(item?.correct);
            const text = (key?: string | null) => question.options.find((option) => option.key === key)?.text;
            return (
              <li key={question.id} className="rounded-2xl border border-line bg-surface p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {correct ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : (
                    <X className="size-4" aria-hidden />
                  )}
                  Question {i + 1} · {correct ? "Correct" : pick ? "Incorrect" : "Not answered"}
                </p>
                <p className="mt-1 font-medium">
                  <InlineMathText text={question.prompt} />
                </p>
                {!correct && (
                  <p className="mt-2 text-sm">
                    {pick ? (
                      <>
                        You chose {pick}: {text(pick)}.{" "}
                      </>
                    ) : null}
                    Answer:{" "}
                    <strong>
                      {item?.answer ?? question.answer}: {text(item?.answer ?? question.answer)}
                    </strong>
                  </p>
                )}
                {(item?.explain || question.explain) && (
                  <p className="mt-2 text-sm text-muted">{item?.explain || question.explain}</p>
                )}
              </li>
            );
          })}
        </ul>

        {theory.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-2xl">Written answers</h2>
            <ul className="mt-3 space-y-3">
              {theory.map((question, i) => (
                <li key={question.id} className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-sm font-semibold">Theory {i + 1}</p>
                  <p className="mt-1 font-medium">
                    <InlineMathText text={question.prompt} />
                  </p>
                  <p className="mt-2 text-sm">Your answer: {written[question.id]?.trim() || "Not answered"}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {result.id && (
            <Link
              to="/studio/review/$attemptId"
              params={{ attemptId: result.id }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-5 font-semibold text-white hover:bg-[#153e25]"
            >
              Review attempt →
            </Link>
          )}
          <button
            type="button"
            className="min-h-11 rounded-full border border-line bg-surface px-5 font-semibold text-ink hover:bg-paper"
            onClick={() => {
              setDone(false);
              setIndex(0);
              setPicks({});
              setWritten({});
              setPhase("mcq");
              setResult(null);
              setError("");
            }}
          >
            Try again
          </button>
          <Link
            to="/studio/topic/$id"
            params={{ id: topic.id }}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold"
          >
            Back to the note
          </Link>
          {next && (
            <Link
              to="/studio/topic/$id"
              params={{ id: next.id }}
              className="inline-flex min-h-11 items-center rounded-full border border-ink px-5 font-semibold"
            >
              Next topic
            </Link>
          )}
        </div>
      </div>
    );
  }

  const effectivePhase = phase === "mcq" && total === 0 ? "theory" : phase;

  if (effectivePhase === "theory") {
    return (
      <div className="mx-auto max-w-2xl pb-8">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          {total > 0 ? (
            <button
              type="button"
              onClick={() => setPhase("mcq")}
              className="font-semibold text-primary"
            >
              Back to objective
            </button>
          ) : (
            <Link
              to="/studio/topic/$id"
              params={{ id: topic.id }}
              className="font-semibold text-primary"
            >
              Back to note
            </Link>
          )}
          <span>Written questions · not auto-marked</span>
        </div>
        <h1 className="mt-4 font-display text-3xl">Written questions</h1>
        <p className="mt-2 text-sm text-muted">
          {theory.length} short questions. Your answers are saved. They are not added to the objective score.
        </p>
        <ul className="mt-5 space-y-4">
          {theory.map((question, i) => (
            <li key={question.id} className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-sm font-semibold text-ink">
                  Theory Question {i + 1} {question.marks ? `· ${question.marks} marks` : ""}
                </span>
                <span className="text-xs font-medium text-muted">Written response</span>
              </div>
              <TheoryQuestionView
                question={question}
                index={i}
                showAnswers={false}
                studentAnswer={written[question.id] ?? ""}
                onStudentAnswerChange={(value) =>
                  setWritten((current) => ({ ...current, [question.id]: value }))
                }
              />
            </li>
          ))}
        </ul>
        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit attempt"}
          </button>
        </div>
      </div>
    );
  }

  const question = questions[index];
  if (!question) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6">
        <h1 className="font-display text-3xl">This question set is incomplete.</h1>
        <p className="mt-2 text-sm text-muted">The server returned no objective questions for this topic.</p>
        <Link
          to="/studio/topic/$id"
          params={{ id: topic.id }}
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg"
        >
          Back to the note
        </Link>
      </div>
    );
  }

  const last = index === total - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <Link
          to="/studio/topic/$id"
          params={{ id: topic.id }}
          className="font-semibold text-primary"
        >
          Back to note
        </Link>
        <span className="shrink-0">
          Question {index + 1} of {total}
        </span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-label={`${answered} of ${total} answered`}>
        {questions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Go to question ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2 flex-1 rounded-full",
              i === index ? "bg-ink" : picks[item.id] ? "bg-primary" : "bg-soft",
            )}
          />
        ))}
      </div>
      <h1 className="mt-6 font-display text-3xl leading-snug">
        <InlineMathText text={question.prompt} />
      </h1>
      <ul className="mt-5 space-y-2" role="radiogroup" aria-label="Options">
        {question.options.map((option) => {
          const selected = picks[question.id] === option.key;
          return (
            <li key={option.key}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPicks((current) => ({ ...current, [question.id]: option.key }))}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                  selected
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-line bg-surface hover:border-ink",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    selected ? "border-primary-fg/60" : "border-line",
                  )}
                >
                  {option.key}
                </span>
                <span>
                  <InlineMathText text={option.text} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {question.options.length === 0 && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          This question has no options in the published bank. Report it to the content team.
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-between gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((current) => current - 1)}
          className="min-h-12 rounded-full border border-line px-5 disabled:opacity-40"
        >
          Previous
        </button>
        {!last ? (
          <button
            type="button"
            onClick={() => setIndex((current) => current + 1)}
            className="min-h-12 rounded-full bg-ink px-6 font-semibold text-primary-fg"
          >
            Next
          </button>
        ) : theory.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => (answered < total ? setConfirming(true) : setPhase("theory"))}
            className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg disabled:opacity-60"
          >
            Continue to written
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => (answered < total ? setConfirming(true) : submit())}
            className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        )}
      </div>
      {confirming && (
        <div
          role="alertdialog"
          aria-label="Continue with unanswered questions"
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6">
            <p className="font-display text-2xl">{total - answered} unanswered.</p>
            <p className="mt-1 text-sm text-muted">
              Continue anyway? Unanswered objective questions count as wrong.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-12 flex-1 rounded-full border border-line font-semibold"
              >
                Keep answering
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  if (theory.length) setPhase("theory");
                  else void submit();
                }}
                className="min-h-12 flex-1 rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
