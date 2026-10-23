import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Target, TrendingUp } from "lucide-react";
import { publishedSubjects, useContent } from "@/lib/content";
import { monthLabel, photoOf, plural, weeksUntil } from "@/lib/format";
import { nextTopic, studyDays } from "@/lib/plan";
import { bestByTopic, trialLeft, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/")({ component: Dashboard });

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${name}.`;
}

function Dashboard() {
  const all = publishedSubjects(useContent((s) => s.subjects));
  const name = useSession((s) => s.name);
  const exams = useSession((s) => s.exams);
  const examMonth = useSession((s) => s.examMonth);
  const attempts = useSession((s) => s.attempts);
  const trialStart = useSession((s) => s.trialStart);
  const subscribed = useSession((s) => s.subscribed);
  const trial = trialLeft(trialStart, subscribed);
  const best = bestByTopic(attempts);

  const mine = all;
  const rows = mine.flatMap((s) => s.topics);
  const finished = rows.filter((t) => best.has(t.id)).length;
  const mineBest = [...best.entries()].filter(([id]) => rows.some((t) => t.id === id));
  const ratios = mineBest.map(([, a]) => Math.round((a.score / a.total) * 100));
  const average = ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : null;
  const days = studyDays(attempts);
  const pick = nextTopic(mine, attempts);
  const weeks = weeksUntil(examMonth);
  const perWeek = weeks ? Math.max(1, Math.ceil((rows.length - finished) / weeks)) : null;

  return (
    <div>
      <h1 className="font-display text-4xl sm:text-5xl">{greeting(name.split(" ")[0] || "there")}</h1>
      <p className="mt-2 max-w-lg text-muted">
        {exams.length ? `Preparing for ${exams.map((e) => e.toUpperCase()).join(" and ")}. ` : ""}
        Physics, Chemistry, Biology, and Mathematics are open.
        {subscribed
          ? " Term access is active."
          : trial.active
            ? ` ${trial.label.replace(" left", "")} of free access left.`
            : " Your free days are over. Notes stay open."}
      </p>

      {pick ? (
        <Link
          to="/studio/topic/$id"
          params={{ id: pick.topic.id }}
          className="card-lift relative mt-6 block overflow-hidden rounded-3xl text-primary-fg"
        >
          <img src={photoOf(pick.subject)} alt="" className="photo absolute inset-0 h-full w-full object-cover" />
          <div className="relative bg-ink/60 p-6 sm:p-8">
            <p className="text-sm font-semibold">{pick.reason === "Revisit" ? "Revisit today" : pick.reason === "Next up" ? "Next up today" : "Start here"}</p>
            <p className="mt-2 max-w-xl font-display text-3xl sm:text-4xl">{pick.topic.title}</p>
            <p className="mt-1 text-sm">
              {pick.subject.name} · {pick.reason === "Revisit" && pick.ratio !== undefined ? `You scored ${Math.round(pick.ratio * 100)}% last time` : `${pick.topic.minutes} min`}
            </p>
            <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold">
              Open note <ArrowRight className="size-4" aria-hidden />
            </span>
          </div>
        </Link>
      ) : (
        <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">You have finished every topic.</p>
          <p className="mt-1 text-sm text-muted">Retake your weakest from Scores to push the average up.</p>
        </div>
      )}

      {weeks && (
        <p className="mt-4 text-sm text-muted">
          {monthLabel(examMonth)}: {plural(rows.length - finished, "topic")} left, {plural(weeks, "week")} to go. About {perWeek} a week keeps you on track.
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          [TrendingUp, `${finished}/${rows.length}`, "topics finished"],
          [Target, average === null ? "None yet" : `${average}%`, "average score"],
          [Flame, plural(days, "day"), "with a set sat"],
        ].map(([Icon, n, d]) => {
          const I = Icon as typeof Flame;
          return (
            <div key={d as string} className="rounded-2xl border border-line bg-surface p-4">
              <I className="size-4 text-primary" aria-hidden />
              <p className="mt-2 font-display text-2xl sm:text-3xl">{n as string}</p>
              <p className="text-xs text-muted sm:text-sm">{d as string}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-3xl">Open subjects</h2>
        <Link to="/studio/subjects" className="min-h-11 text-sm font-semibold leading-[2.75rem] text-primary">
          Browse subjects
        </Link>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mine.map((subject) => {
          const done = subject.topics.filter((t) => best.has(t.id)).length;
          return (
            <li key={subject.id} className="h-full">
              <Link to="/studio/subject/$id" params={{ id: subject.id }} className="card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                <img src={photoOf(subject)} alt="" className="photo aspect-[16/10] w-full object-cover" />
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs font-semibold text-primary">Available now</p>
                  <h3 className="font-display text-xl leading-tight">{subject.name}</h3>
                  <p className="mt-1 text-sm text-muted">{done} of {subject.topics.length} finished</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-10 font-display text-3xl">Practice modes</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Link to="/studio/subjects" className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">Open</p>
          <h3 className="mt-1 font-display text-xl">Topic quizzes</h3>
          <p className="mt-2 text-sm text-muted">Short sets across Physics, Chemistry, Biology, and Mathematics.</p>
        </Link>
        <Link to="/studio/cbt" className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">Open</p>
          <h3 className="mt-1 font-display text-xl">WAEC past papers</h3>
          <p className="mt-2 text-sm text-muted">Synthetic WAEC-style papers are available in the demo workflow.</p>
        </Link>
        <Link to="/studio/cbt" className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">Open</p>
          <h3 className="mt-1 font-display text-xl">JAMB CBT</h3>
          <p className="mt-2 text-sm text-muted">The demo full-paper CBT is ready for the standard four-subject format.</p>
        </Link>
      </div>
    </div>
  );
}
