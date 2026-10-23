import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Choice } from "@/data/catalog";
import { findWaecPaper } from "@/data/demo";
import { scoreObjective } from "@/lib/assessment";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/cbt/waec/$paperId")({ component: WaecPaperPage });

function formatTime(sec: number) {
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function WaecPaperPage() {
  const { paperId } = Route.useParams();
  const paper = findWaecPaper(paperId);
  const demoMode = useSession((s) => s.demoMode);
  const record = useSession((s) => s.record);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Choice>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [left, setLeft] = useState(paper?.timerSeconds ?? 0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const submitted = useRef(false);
  const endsAt = useRef<number | null>(null);

  const objectives = paper?.objectives ?? [];
  const theory = paper?.theory ?? [];
  const totalSteps = objectives.length + theory.length;
  const { score, total } = useMemo(() => scoreObjective(objectives, picks), [objectives, picks]);

  useEffect(() => {
    if (!started || done || !paper) return;
    if (!endsAt.current) endsAt.current = Date.now() + paper.timerSeconds * 1000;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt.current! - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0) submit();
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [started, done, paper]);

  const submit = () => {
    if (submitted.current || !paper) return;
    submitted.current = true;
    const items = [
      ...objectives.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain, answerKeyStatus: q.answerKeyStatus, pick: picks[q.id] })),
      ...theory.map((t) => ({ id: t.id, prompt: t.prompt, theory: true as const, written: written[t.id], modelAnswer: t.modelAnswer })),
    ];
    const id = record({ topicId: paper.id, title: paper.title, score, total, kind: "waec", demo: true, picks, written, items, paperId: paper.id, subjectLabel: paper.subjectName });
    setAttemptId(id); setDone(true);
  };

  if (!paper) return (<div className="mx-auto max-w-md text-center"><h1 className="font-display text-3xl">Paper not found</h1><Link to="/studio/cbt" className="mt-4 inline-flex text-sm font-semibold text-primary">Back to Take CBT</Link></div>);
  if (!demoMode) return (<div className="mx-auto max-w-md text-center"><h1 className="font-display text-3xl">Demo mode off</h1><Link to="/studio/account" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Account</Link></div>);

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/studio/cbt" className="text-sm font-semibold text-primary">← Take CBT</Link>
        <p className="mt-4 rounded-xl bg-soft px-3 py-2 text-sm font-medium text-muted">{paper.label}</p>
        <h1 className="mt-3 font-display text-4xl">{paper.title}</h1>
        <p className="mt-2 text-sm text-muted">{paper.subjectName} · {paper.component} · {objectives.length} objective · {theory.length} theory · {Math.round(paper.timerSeconds / 60)} min</p>
        <button type="button" onClick={() => { endsAt.current = Date.now() + paper.timerSeconds * 1000; setStarted(true); }} className="mt-6 min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Start paper</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold text-primary">Demo WAEC result</p>
        <h1 className="mt-1 font-display text-4xl">{total > 0 ? `${score}/${total}` : "Theory saved"}</h1>
        <p className="mt-2 text-muted">Objective items marked with demo keys only. Theory is not auto-marked.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/studio/progress" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">Progress</Link>
          {attemptId && <Link to="/studio/review/$attemptId" params={{ attemptId }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Review</Link>}
        </div>
      </div>
    );
  }

  const onObj = index < objectives.length;
  const q = onObj ? objectives[index] : null;
  const tq = !onObj ? theory[index - objectives.length] : null;

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">Demo WAEC</p>
        <p className="rounded-full bg-soft px-3 py-1 text-sm font-semibold">{formatTime(left)}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{onObj ? `Objective ${index + 1}/${objectives.length}` : `Theory ${index - objectives.length + 1}/${theory.length}`}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button key={i} type="button" onClick={() => setIndex(i)} className={cn("size-8 rounded text-xs font-semibold", i === index ? "bg-primary text-primary-fg" : "border border-line")}>{i + 1}</button>
        ))}
      </div>
      {q && (
        <>
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
        </>
      )}
      {tq && (
        <>
          <h1 className="mt-6 font-display text-2xl leading-snug">{tq.prompt}</h1>
          <textarea value={written[tq.id] ?? ""} onChange={(e) => setWritten((w) => ({ ...w, [tq.id]: e.target.value }))} rows={7} className="mt-4 w-full rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-primary" placeholder="Write your answer…" />
        </>
      )}
      <div className="mt-6 flex justify-between gap-2">
        <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="min-h-11 rounded-full border border-line px-4 disabled:opacity-40">Previous</button>
        {index < totalSteps - 1 ? (
          <button type="button" onClick={() => setIndex((i) => i + 1)} className="min-h-11 rounded-full bg-ink px-5 font-semibold text-primary-fg">Next</button>
        ) : (
          <button type="button" onClick={submit} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg">Submit paper</button>
        )}
      </div>
    </div>
  );
}
