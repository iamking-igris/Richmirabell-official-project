import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { seedPayments, seedRecent, seedStudents, seedWeakTopics } from "@/data/seed-admin";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { naira } from "@/lib/format";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/admin/")({ component: Overview });

function Overview() {
  const subjects = useContent((s) => s.subjects);
  const local = useSession((s) => s.payments);
  const attempts = useSession((s) => s.attempts);
  const name = useSession((s) => s.name);
  const subscribed = useSession((s) => s.subscribed);
  const published = publishedSubjects(subjects).flatMap((s) => s.topics);
  const payments = useMemo(() => [...local, ...seedPayments()].filter((p) => p.status === "Successful"), [local]);
  const students = seedStudents.length + (name ? 1 : 0);
  const trials = seedStudents.filter((x) => x.status === "Trial").length + (name && !subscribed ? 1 : 0);
  const active = seedStudents.filter((x) => x.activeDaysAgo <= 7).length + (name ? 1 : 0);
  const weekSets = 146 + attempts.length;

  const recent = [
    ...attempts.slice(0, 3).map((a) => ({ name, topicId: a.topicId, score: a.score, total: a.total, label: new Date(a.at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" }) })),
    ...seedRecent.map((r) => ({ ...r, label: r.minutesAgo < 60 ? `${r.minutesAgo} min ago` : `${Math.round(r.minutesAgo / 60)} h ago` })),
  ].slice(0, 6);

  return (
    <div>
      <h1 className="font-display text-4xl">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Active students" value={String(active)} />
        <Stat label="Trials running" value={String(trials)} />
        <Stat label="Paid this term" value={String(payments.length)} />
        <Stat label="Revenue" value={naira(payments.reduce((s, p) => s + p.amount, 0))} />
        <Stat label="Sets sat this week" value={String(weekSets)} />
      </div>
      <p className="mt-2 text-sm text-muted">{students} students · {published.length} topics published</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Weakest topics across students</h2>
          <ul className="mt-4 space-y-4">
            {seedWeakTopics.map((w) => {
              const hit = locateTopic(subjects, w.topicId);
              if (!hit) return null;
              return (
                <li key={w.topicId}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{hit.topic.title} <span className="text-muted">· {hit.subject.name}</span></span>
                    <span className="font-semibold">{w.avg}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft"><div className="h-full bg-primary" style={{ width: `${w.avg}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Recent attempts</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <span>{r.name} <span className="text-muted">· {locateTopic(subjects, r.topicId)?.topic.title ?? r.topicId}</span></span>
                <span className="shrink-0"><strong>{r.score}/{r.total}</strong> <span className="text-muted">{r.label}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/admin/topics" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Add topic</Link>
        <Link to="/admin/briefings" className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-sm">Add briefing</Link>
        <Link to="/admin/payments" className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-sm">View payments</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl sm:text-3xl">{value}</p>
    </div>
  );
}
