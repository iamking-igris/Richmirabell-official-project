import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Choice } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { trialLeft, useSession } from "@/lib/session";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { TheoryQuestionView } from "@/components/TheoryQuestionView";

export const Route = createFileRoute("/studio/practice/$id")({ component: PracticePage });

const KEYS: Choice[] = ["A", "B", "C", "D"];

function verdict(score: number, total: number) {
  const r = score / Math.max(total, 1);
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
  const [written, setWritten] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"mcq" | "theory">("mcq");
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const questions = found?.topic.questions ?? [];
  const theory = found?.topic.theory ?? [];
  const total = questions.length;
  const score = useMemo(() => {
    if (!found) return 0;
    return questions.filter((q) => q.answer != null && picks[q.id] === q.answer).length;
  }, [found, questions, picks]);

  useEffect(() => {
    if (!found || done || !open || phase !== "mcq") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const k = e.key.toUpperCase();
      const n = Number(e.key);
      const choice = KEYS.includes(k as Choice) ? (k as Choice) : n >= 1 && n <= 4 ? KEYS[n - 1] : null;
      if (choice && questions[index]) setPicks((p) => ({ ...p, [questions[index].id]: choice }));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, questions.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [found, index, done, open, phase, questions]);

  if (!found) return <p>That set is not on Richmirabel.</p>;
  const { subject, topic } = found;

  if (!open) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6">
        <h1 className="font-display text-3xl">Your free days are over.</h1>
        <p className="mt-2 text-muted">Practice needs a plan. Notes stay open.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/studio/plan" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg">See plan</Link>
          <Link to="/studio/topic/$id" params={{ id: topic.id }} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold">Back to the note</Link>
        </div>
      </div>
    );
  }

  function submit() {
    const items = [
      ...questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        explain: q.explain,
        answerKeyStatus: q.answerKeyStatus,
        pick: picks[q.id],
        theory: false,
      })),
      ...theory.map((t) => ({
        id: t.id,
        prompt: t.prompt,
        theory: true,
        written: written[t.id],
        modelAnswer: t.modelAnswer,
        explain: t.explain,
      })),
    ];

    const savedId = record({
      topicId: topic.id,
      title: topic.title,
      score,
      total,
      kind: "topic",
      demo: topic.origin === "demo",
      picks,
      written,
      items,
      subjectLabel: subject.name,
    });
    setAttemptId(savedId);
    setConfirming(false);
    setDone(true);
  }

  if (done) {
    const at = subject.topics.findIndex((t) => t.id === topic.id);
    const next = subject.topics[at + 1];
    return (
      <div className="mx-auto max-w-2xl pb-8">
        <p className="text-sm text-primary">{subject.name} · {topic.title}</p>
        <h1 className="mt-1 font-display text-6xl">{score}/{total}</h1>
        <p className="mt-1 text-lg">{verdict(score, total)}</p>
        <p className="mt-1 text-sm text-muted">Objective score only. Written answers are saved, not formally marked.</p>

        {/* Prominent Review Attempt Button */}
        {attemptId && (
          <div className="mt-5 rounded-2xl border border-[#1A4D2E]/20 bg-[#FDFBF7] p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div>
              <p className="font-serif font-bold text-base text-[#1A4D2E]">
                Want deep AI diagnostics on this attempt?
              </p>
              <p className="font-sans text-xs text-[#6B6B6B]">
                Review strengths, common misconceptions, and step-by-step worked solutions for every question.
              </p>
            </div>
            <Link
              to="/studio/review/$attemptId"
              params={{ attemptId }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1A4D2E] px-5 text-sm font-semibold text-white shadow-xs hover:bg-[#153e25] transition-all"
            >
              <span>Review Attempt</span>
              <span>→</span>
            </Link>
          </div>
        )}

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
        {theory.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-2xl">Written answers</h2>
            <ul className="mt-3 space-y-3">
              {theory.map((t, i) => (
                <li key={t.id} className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-sm font-semibold">Theory {i + 1}</p>
                  <p className="mt-1 font-medium">{t.prompt}</p>
                  <p className="mt-2 text-sm">Your answer: {written[t.id]?.trim() || "Not answered"}</p>
                  {t.modelAnswer && <p className="mt-2 text-sm text-muted">Model answer: {t.modelAnswer}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {attemptId && (
            <Link
              to="/studio/review/$attemptId"
              params={{ attemptId }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-5 font-semibold text-white hover:bg-[#153e25]"
            >
              Review Attempt →
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
              setAttemptId(null);
            }}
          >
            Try again
          </button>
          <Link to="/studio/topic/$id" params={{ id: topic.id }} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold">Back to the note</Link>
          {next && <Link to="/studio/topic/$id" params={{ id: next.id }} className="inline-flex min-h-11 items-center rounded-full border border-ink px-5 font-semibold">Next topic</Link>}
        </div>
      </div>
    );
  }

  if (phase === "theory") {
    return (
      <div className="mx-auto max-w-2xl pb-8">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <button type="button" onClick={() => setPhase("mcq")} className="font-semibold text-primary">Back to objective</button>
          <span>Written questions · not auto-marked</span>
        </div>
        <h1 className="mt-4 font-display text-3xl">Written questions</h1>
        <p className="mt-2 text-sm text-muted">{theory.length} short questions. Your answers are saved. They are not added to the objective score.</p>
        <ul className="mt-5 space-y-4">
          {theory.map((t, i) => (
            <li key={t.id} className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-semibold text-sm text-ink">
                  Theory Question {i + 1} {t.marks ? `· ${t.marks} marks` : ""}
                </span>
                <span className="text-xs text-muted font-medium">Written response</span>
              </div>
              <TheoryQuestionView
                question={t}
                index={i}
                showAnswers={false}
                studentAnswer={written[t.id] ?? ""}
                onStudentAnswerChange={(val) => setWritten((prev) => ({ ...prev, [t.id]: val }))}
              />
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={submit} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Submit attempt</button>
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
          <button key={q.id} type="button" aria-label={`Go to question ${i + 1}`} onClick={() => setIndex(i)} className={cn("h-2 flex-1 rounded-full", i === index ? "bg-ink" : picks[q.id] ? "bg-primary" : "bg-soft")} />
        ))}
      </div>
      <h1 className="mt-6 font-display text-3xl leading-snug"><InlineMathText text={question.prompt} /></h1>
      <ul className="mt-5 space-y-2" role="radiogroup" aria-label="Options">
        {question.options.map((option) => {
          const selected = picks[question.id] === option.key;
          return (
            <li key={option.key}>
              <button type="button" role="radio" aria-checked={selected} onClick={() => setPicks((prev) => ({ ...prev, [question.id]: option.key }))} className={cn("flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left", selected ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:border-ink")}>
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", selected ? "border-primary-fg/60" : "border-line")}>{option.key}</span>
                <span><InlineMathText text={option.text} /></span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex justify-between gap-2">
        <button type="button" disabled={index === 0} onClick={() => setIndex((n) => n - 1)} className="min-h-12 rounded-full border border-line px-5 disabled:opacity-40">Previous</button>
        {!last ? (
          <button type="button" onClick={() => setIndex((n) => n + 1)} className="min-h-12 rounded-full bg-ink px-6 font-semibold text-primary-fg">Next</button>
        ) : theory.length > 0 ? (
          <button type="button" onClick={() => (answered < total ? setConfirming(true) : setPhase("theory"))} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Continue to written</button>
        ) : (
          <button type="button" onClick={() => (answered < total ? setConfirming(true) : submit())} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Submit</button>
        )}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label="Continue with unanswered questions" className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6">
            <p className="font-display text-2xl">{total - answered} unanswered.</p>
            <p className="mt-1 text-sm text-muted">Continue anyway? Unanswered objective questions count as wrong.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="min-h-12 flex-1 rounded-full border border-line font-semibold">Keep answering</button>
              <button type="button" onClick={() => { setConfirming(false); theory.length ? setPhase("theory") : submit(); }} className="min-h-12 flex-1 rounded-full bg-primary font-semibold text-primary-fg">Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
