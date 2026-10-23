import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Choice } from "@/data/catalog";
import { buildJambPaper, demoJambPaper } from "@/data/demo";
import { scoreObjective } from "@/lib/assessment";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/cbt/jamb")({ component: JambCbtPage });

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function JambCbtPage() {
  const demoMode = useSession((s) => s.demoMode);
  const record = useSession((s) => s.record);
  const jambSubjects = useSession((s) => s.jambSubjects);
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Choice>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [left, setLeft] = useState(demoJambPaper.timerSeconds);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const submitted = useRef(false);
  const endsAt = useRef<number | null>(null);

  const subjectFilter = useMemo(() => {
    const optional = jambSubjects.length === 3 ? jambSubjects : ["physics", "mathematics", "chemistry"];
    return ["english", ...optional.map((s) => s.toLowerCase())];
  }, [jambSubjects]);

  const questions = useMemo(() => buildJambPaper(subjectFilter), [subjectFilter]);
  const { score, total } = useMemo(() => scoreObjective(questions, picks), [questions, picks]);

  useEffect(() => {
    if (!started || done) return;
    if (!endsAt.current) endsAt.current = Date.now() + demoJambPaper.timerSeconds * 1000;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt.current! - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0) submit();
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [started, done]);

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    const items = questions.map((q) => ({
      id: q.id, prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain,
      answerKeyStatus: q.answerKeyStatus, pick: picks[q.id],
    }));
    const id = record({
      topicId: demoJambPaper.id, title: demoJambPaper.title, score, total, kind: "jamb", demo: true,
      picks, items, paperId: demoJambPaper.id, subjectLabel: "JAMB CBT demo",
    });
    setAttemptId(id);
    setDone(true);
  };

  if (!demoMode) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">Demo mode off</h1>
        <p className="mt-2 text-sm text-muted">Enable Demo mode in Account to run the synthetic JAMB CBT.</p>
        <Link to="/studio/account" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Account</Link>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/studio/cbt" className="text-sm font-semibold text-primary">← Take CBT</Link>
        <p className="mt-4 rounded-xl bg-soft px-3 py-2 text-sm font-medium text-muted">{demoJambPaper.label}</p>
        <h1 className="mt-3 font-display text-4xl">{demoJambPaper.title}</h1>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>{questions.length} synthetic questions across {subjectFilter.length} subjects</li>
          <li>Timer: {Math.round(demoJambPaper.timerSeconds / 60)} minutes (auto-submits)</li>
          <li>Flag questions; navigate by number</li>
          <li>Not an official JAMB paper — for product testing only</li>
        </ul>
        <button type="button" onClick={() => { endsAt.current = Date.now() + demoJambPaper.timerSeconds * 1000; setStarted(true); }} className="mt-6 min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Start session</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold text-primary">Demo JAMB result</p>
        <h1 className="mt-1 font-display text-4xl">{score}/{total}</h1>
        <p className="mt-2 text-muted">Synthetic answer keys only. This is not an official score.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/studio/progress" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">Progress</Link>
          {attemptId && <Link to="/studio/review/$attemptId" params={{ attemptId }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Review answers</Link>}
        </div>
      </div>
    );
  }

  const q = questions[index];
  if (!q) return null;

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">Demo JAMB CBT</p>
        <p className={`rounded-full px-3 py-1 text-sm font-semibold ${left < 60 ? "bg-ink text-primary-fg" : "bg-soft"}`}>{formatTime(left)}</p>
      </div>
      <p className="mt-1 text-xs text-muted">Q{index + 1}/{questions.length} · {q.subjectId} · DEMO</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {questions.map((item, i) => (
          <button key={item.id} type="button" onClick={() => setIndex(i)} className={cn("size-8 rounded text-xs font-semibold", i === index ? "bg-primary text-primary-fg" : picks[item.id] ? "bg-soft" : "border border-line", flagged.has(item.id) && "ring-2 ring-brass")}>{i + 1}</button>
        ))}
      </div>
      <h1 className="mt-6 font-display text-2xl leading-snug">{q.prompt}</h1>
      <ul className="mt-5 space-y-2">
        {q.options.map((opt) => {
          const selected = picks[q.id] === opt.key;
          return (
            <li key={opt.key}>
              <button type="button" onClick={() => setPicks((p) => ({ ...p, [q.id]: opt.key }))} className={cn("flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left", selected ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface")}>
                <span className="flex size-8 items-center justify-center rounded-full border text-sm font-semibold">{opt.key}</span>
                <span>{opt.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="min-h-11 rounded-full border border-line px-4 disabled:opacity-40">Previous</button>
        <button type="button" onClick={() => setFlagged((f) => { const n = new Set(f); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })} className="min-h-11 rounded-full border border-line px-4 text-sm">{flagged.has(q.id) ? "Unflag" : "Flag"}</button>
        {index < questions.length - 1 ? (
          <button type="button" onClick={() => setIndex((i) => i + 1)} className="min-h-11 rounded-full bg-ink px-5 font-semibold text-primary-fg">Next</button>
        ) : (
          <button type="button" onClick={submit} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg">Submit paper</button>
        )}
      </div>
      <button type="button" onClick={() => { if (window.confirm("Leave this demo session?")) navigate({ to: "/studio/cbt" }); }} className="mt-4 text-sm text-muted underline">Exit without saving</button>
    </div>
  );
}
