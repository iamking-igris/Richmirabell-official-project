import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Choice } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { trialLeft, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/practice/$id")({ component: PracticePage });

const KEYS: Choice[] = ["A", "B", "C", "D"];

function verdict(score: number, total: number) {
  const r = score / total;
  if (r === 1) return "Clean sweep.";
  if (r >= 0.75) return "Strong. One to review.";
  if (r >= 0.5) return "Half there. Read the note again.";
  return "Start with the note, then try again.";
}

function PracticePage() {
  const { id } = Route.useParams();
  const found = locateTopic(publishedSubjects(useContent((s) => s.subjects)), id);
  const record = useSession((s) => s.record);
  const trialStart = useSession((s) => s.trialStart);
  const subscribed = useSession((s) => s.subscribed);
  const open = trialLeft(trialStart, subscribed).active;
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Choice>>({});
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const total = found?.topic.questions.length ?? 0;
  const score = useMemo(() => {
    if (!found) return 0;
    return found.topic.questions.filter((q) => q.answer != null && picks[q.id] === q.answer).length;
  }, [found, picks]);

  useEffect(() => {
    if (!found || done || !open) return;
    const qs = found.topic.questions;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toUpperCase();
      const n = Number(e.key);
      const choice = KEYS.includes(k as Choice) ? (k as Choice) : n >= 1 && n <= 4 ? KEYS[n - 1] : null;
      if (choice) setPicks((p) => ({ ...p, [qs[index].id]: choice }));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, qs.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [found, index, done, open]);

  if (!found) return <p>That set is not on Richmirabel.</p>;
  const { subject, topic } = found;

  if (!open) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6">
        <h1 className="font-display text-3xl">Your free days are over.</h1>
        <p className="mt-2 text-muted">Practice needs a plan. Notes stay open.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/studio/plan" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg">
            See plan
          </Link>
          <Link to="/studio/topic/$id" params={{ id: topic.id }} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold">
            Back to the note
          </Link>
        </div>
      </div>
    );
  }

  function submit() {
    record({ topicId: topic.id, title: topic.title, score, total, kind: "topic", demo: topic.origin === "demo", picks, subjectLabel: subject.name });
    setConfirming(false);
    setDone(true);
  }

  if (done) {
    const at = subject.topics.findIndex((t) => t.id === topic.id);
    const next = subject.topics[at + 1];
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-primary">{subject.name} · {topic.title}</p>
        <h1 className="mt-1 font-display text-6xl">{score}/{total}</h1>
        <p className="mt-1 text-lg">{verdict(score, total)}</p>
        <ul className="mt-6 space-y-3">
          {topic.questions.map((question, i) => {
            const pick = picks[question.id];
            const correct = pick === question.answer;
            const text = (key?: Choice) => question.options.find((o) => o.key === key)?.text;
            return (
              <li key={question.id} className="rounded-2xl border border-line bg-surface p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {correct ? <Check className="size-4 text-primary" aria-hidden /> : <X className="size-4" aria-hidden />}
                  Question {i + 1} · {correct ? "Correct" : pick ? "Incorrect" : "Not answered"}
                </p>
                <p className="mt-1 font-medium">{question.prompt}</p>
                {!correct && (
                  <p className="mt-2 text-sm">
                    {pick ? <>You chose {pick}: {text(pick)}. </> : null}
                    Answer: <strong>{question.answer}: {text(question.answer)}</strong>
                  </p>
                )}
                <p className="mt-2 text-sm text-muted">{question.explain}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg" onClick={() => { setDone(false); setIndex(0); setPicks({}); }}>
            Try again
          </button>
          <Link to="/studio/topic/$id" params={{ id: topic.id }} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold">
            Back to the note
          </Link>
          {next && (
            <Link to="/studio/topic/$id" params={{ id: next.id }} className="inline-flex min-h-11 items-center rounded-full border border-ink px-5 font-semibold">
              Next topic
            </Link>
          )}
        </div>
      </div>
    );
  }

  const question = topic.questions[index];
  const answered = topic.questions.filter((q) => picks[q.id]).length;
  const last = index === total - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <Link to="/studio/topic/$id" params={{ id: topic.id }} className="font-semibold text-primary">Back to note</Link>
        <span className="shrink-0">Question {index + 1} of {total}</span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-label={`${answered} of ${total} answered`}>
        {topic.questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            aria-label={`Go to question ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn("h-2 flex-1 rounded-full", i === index ? "bg-ink" : picks[q.id] ? "bg-primary" : "bg-soft")}
          />
        ))}
      </div>
      <h1 className="mt-6 font-display text-3xl leading-snug">{question.prompt}</h1>
      <ul className="mt-5 space-y-2" role="radiogroup" aria-label="Options">
        {question.options.map((option) => {
          const selected = picks[question.id] === option.key;
          return (
            <li key={option.key}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPicks((prev) => ({ ...prev, [question.id]: option.key }))}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                  selected ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:border-ink",
                )}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", selected ? "border-primary-fg/60" : "border-line")}>{option.key}</span>
                <span>{option.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex justify-between gap-2">
        <button type="button" disabled={index === 0} onClick={() => setIndex((n) => n - 1)} className="min-h-12 rounded-full border border-line px-5 disabled:opacity-40">
          Previous
        </button>
        {!last ? (
          <button type="button" onClick={() => setIndex((n) => n + 1)} className="min-h-12 rounded-full bg-ink px-6 font-semibold text-primary-fg">
            Next
          </button>
        ) : (
          <button type="button" onClick={() => (answered < total ? setConfirming(true) : submit())} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">
            Submit
          </button>
        )}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label="Submit with unanswered questions" className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6">
            <p className="font-display text-2xl">{total - answered} unanswered.</p>
            <p className="mt-1 text-sm text-muted">Submit anyway? They count as wrong.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="min-h-12 flex-1 rounded-full border border-line font-semibold">Keep answering</button>
              <button type="button" onClick={submit} className="min-h-12 flex-1 rounded-full bg-primary font-semibold text-primary-fg">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
