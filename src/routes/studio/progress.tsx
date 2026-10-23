import { createFileRoute, Link } from "@tanstack/react-router";
import { attemptsByKind } from "@/lib/assessment";
import { availableSubjects, useContent } from "@/lib/content";
import { plural } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/progress")({ component: ProgressPage });

function ProgressPage() {
  const attempts = useSession((s) => s.attempts);
  const demoMode = useSession((s) => s.demoMode);
  const best = bestByTopic(attempts);
  const subjects = availableSubjects(useContent((s) => s.subjects));
  const { topic: topicAttempts, jamb, waec } = attemptsByKind(attempts);

  const groups = subjects.map((subject) => ({
    subject,
    rows: subject.topics.filter((t) => demoMode || t.origin !== "demo").map((topic) => {
      const attempt = best.get(topic.id);
      const tries = topicAttempts.filter((a) => a.topicId === topic.id);
      return { topic, attempt, tries: tries.length, pct: attempt ? Math.round((attempt.score / Math.max(attempt.total, 1)) * 100) : null };
    }),
  }));
  const flat = groups.flatMap((g) => g.rows.map((r) => ({ ...r, subject: g.subject })));
  const sat = flat.filter((r) => r.pct !== null);
  const weak = [...sat].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).slice(0, 3);
  const average = sat.length ? Math.round(sat.reduce((s, r) => s + (r.pct ?? 0), 0) / sat.length) : null;

  return (
    <div>
      <h1 className="font-display text-4xl">Progress</h1>
      <p className="mt-2 max-w-xl text-muted">
        {attempts.length === 0
          ? "No attempts yet. Open Physics for a topic quiz, or use Take CBT for demo JAMB/WAEC papers."
          : `${plural(topicAttempts.length, "topic attempt")} · ${plural(jamb.length, "JAMB demo")} · ${plural(waec.length, "WAEC demo")}${average != null ? ` · topic average of best ${average}%` : ""}`}
      </p>
      {weak.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-2xl">Needs attention</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {weak.map((row) => (
              <li key={row.topic.id} className="flex flex-col rounded-2xl border border-line bg-surface p-4">
                <p className="text-sm text-muted">{row.subject.name} · topic quiz</p>
                <p className="mt-1 font-medium">{row.topic.title}</p>
                <p className="mt-2 font-display text-4xl">{row.pct}%</p>
                <div className="mt-auto flex gap-2 pt-4">
                  <Link to="/studio/topic/$id" params={{ id: row.topic.id }} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line text-sm font-semibold">Read note</Link>
                  <Link to="/studio/practice/$id" params={{ id: row.topic.id }} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">Practise</Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {groups.map(({ subject, rows }) => (
        <section key={subject.id} className="mt-8">
          <h2 className="font-display text-2xl">{subject.name} — topic quizzes</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {rows.map((row) => (
              <li key={row.topic.id}>
                <Link to="/studio/topic/$id" params={{ id: row.topic.id }} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                  <span>
                    <span className="block font-medium">{row.topic.title}{row.topic.origin === "demo" ? <span className="ml-2 text-xs text-muted">DEMO</span> : null}</span>
                    <span className="block text-xs text-muted">{row.tries === 0 ? "Not started" : `${plural(row.tries, "attempt")} · best ${row.attempt?.score}/{row.attempt?.total}`}</span>
                  </span>
                  <span className="text-sm font-semibold">{row.attempt ? `${row.pct}%` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mt-8">
        <h2 className="font-display text-2xl">JAMB CBT attempts</h2>
        {jamb.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line p-5 text-sm text-muted">No JAMB CBT attempts yet. Demo mode provides a synthetic 40-question paper from Take CBT.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {jamb.map((a) => (
              <li key={a.id}>
                <Link to="/studio/review/$attemptId" params={{ attemptId: a.id }} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                  <span><span className="block font-medium">{a.title}</span><span className="block text-xs text-muted">{new Date(a.at).toLocaleString()}{a.demo ? " · DEMO" : ""}</span></span>
                  <span className="text-sm font-semibold">{a.score}/{a.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="font-display text-2xl">WAEC attempts</h2>
        {waec.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line p-5 text-sm text-muted">No WAEC attempts yet. Demo mode provides synthetic papers from Take CBT.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {waec.map((a) => (
              <li key={a.id}>
                <Link to="/studio/review/$attemptId" params={{ attemptId: a.id }} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                  <span><span className="block font-medium">{a.title}</span><span className="block text-xs text-muted">{new Date(a.at).toLocaleString()}{a.demo ? " · DEMO" : ""}</span></span>
                  <span className="text-sm font-semibold">{a.total > 0 ? `${a.score}/${a.total}` : "Theory"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
