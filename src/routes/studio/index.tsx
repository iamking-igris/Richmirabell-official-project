import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Target, TrendingUp } from "lucide-react";
import { publishedSubjects, useContent } from "@/lib/content";
import { monthLabel, photoOf, plural, weeksUntil } from "@/lib/format";
import { nextTopic, studyDays } from "@/lib/plan";
import { bestByTopic, trialLeft, useSession } from "@/lib/session";
import { PageCardSkeleton } from "@/lib/admin-ui";

export const Route = createFileRoute("/studio/")({ component: Dashboard });

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${name}.`;
}

function Dashboard() {
  const all = publishedSubjects(useContent((s) => s.subjects));
  const loading = useContent((s) => s.loading);
  const error = useContent((s) => s.error);
  const name = useSession((s) => s.name);
  const email = useSession((s) => s.email);
  const exams = useSession((s) => s.exams);
  const examMonth = useSession((s) => s.examMonth);
  const attempts = useSession((s) => s.attempts);
  const trialStart = useSession((s) => s.trialStart);
  const subscribed = useSession((s) => s.subscribed);
  const trial = trialLeft(trialStart, subscribed);
  const best = bestByTopic(attempts);

  const selected = useSession((s) => s.selectedSubjects);
  const mine = selected.length
    ? selected
        .map((id) => all.find((subject) => subject.id === id))
        .filter((subject): subject is (typeof all)[number] => Boolean(subject))
    : all.slice(0, 4);
  const rows = mine.flatMap((subject) => subject.topics);
  const finished = rows.filter((topic) => best.has(topic.id)).length;
  const mineBest = [...best.entries()].filter(([id]) => rows.some((topic) => topic.id === id));
  const ratios = mineBest.map(([, attempt]) => Math.round((attempt.score / Math.max(attempt.total, 1)) * 100));
  const average = ratios.length
    ? Math.round(ratios.reduce((sum, value) => sum + value, 0) / ratios.length)
    : null;
  const days = studyDays(attempts);
  const pick = nextTopic(mine, attempts);
  const weeks = weeksUntil(examMonth);
  const perWeek = weeks ? Math.max(1, Math.ceil((rows.length - finished) / weeks)) : null;
  const displayName = name || email.split("@")[0] || "there";

  return (
    <div>
      <h1 className="font-display text-4xl sm:text-5xl">{greeting(displayName.split(" ")[0])}</h1>
      <p className="mt-2 max-w-lg text-muted">
        {exams.length ? `Preparing for ${exams.map((exam) => exam.toUpperCase()).join(" and ")}. ` : ""}
        Your subjects: {mine.map((subject) => subject.name).join(", ") || "not set yet"}.
        {subscribed
          ? " Monthly access is active."
          : trial.active
            ? ` ${trial.label.replace(" left", "")} of free access left.`
            : " Your free days are over. Subscribe to reopen practice."}
      </p>

      {loading && !all.length ? (
        <PageCardSkeleton cards={5} />
      ) : error && !all.length ? (
        <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">Could not load content</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => void useContent.getState().refresh().catch(() => undefined)}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Try again
          </button>
        </div>
      ) : !mine.length || !rows.length ? (
        <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">No published topics yet.</p>
          <p className="mt-1 text-sm text-muted">
            Your subjects are saved, but the content team has not published lessons for them yet. Check back soon or
            review your subject choices.
          </p>
          <Link
            to="/studio/profile"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Review subjects
          </Link>
        </div>
      ) : pick ? (
        <Link
          to="/studio/topic/$id"
          params={{ id: pick.topic.id }}
          className="card-lift relative mt-6 block overflow-hidden rounded-3xl text-primary-fg"
        >
          <img src={photoOf(pick.subject)} alt="" className="photo absolute inset-0 h-full w-full object-cover" />
          <div className="relative bg-ink/60 p-6 sm:p-8">
            <p className="text-sm font-semibold">
              {pick.reason === "Revisit" ? "Revisit today" : pick.reason === "Next up" ? "Next up today" : "Start here"}
            </p>
            <p className="mt-2 max-w-xl font-display text-3xl sm:text-4xl">{pick.topic.title}</p>
            <p className="mt-1 text-sm">
              {pick.subject.name} ·{" "}
              {pick.reason === "Revisit" && pick.ratio !== undefined
                ? `You scored ${Math.round(pick.ratio * 100)}% last time`
                : `${pick.topic.minutes} min`}
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

      {weeks && rows.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          {monthLabel(examMonth)}: {plural(rows.length - finished, "topic")} left, {plural(weeks, "week")} to go. About{" "}
          {perWeek} a week keeps you on track.
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          [TrendingUp, `${finished}/${rows.length}`, "topics finished"],
          [Target, average === null ? "None yet" : `${average}%`, "average score"],
          [Flame, plural(days, "day"), "with a set sat"],
        ].map(([Icon, value, label]) => {
          const Component = Icon as typeof Flame;
          return (
            <div key={label as string} className="rounded-2xl border border-line bg-surface p-4">
              <Component className="size-4 text-primary" aria-hidden />
              <p className="mt-2 font-display text-2xl sm:text-3xl">{value as string}</p>
              <p className="text-xs text-muted sm:text-sm">{label as string}</p>
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
      {mine.length ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {mine.map((subject) => {
            const done = subject.topics.filter((topic) => best.has(topic.id)).length;
            return (
              <li key={subject.id} className="h-full">
                <Link
                  to="/studio/subject/$id"
                  params={{ id: subject.id }}
                  className="card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface"
                >
                  <img src={photoOf(subject)} alt="" className="photo aspect-[16/10] w-full object-cover" />
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-xs font-semibold text-primary">
                      {subject.topics.length ? "Published content" : "Awaiting content"}
                    </p>
                    <h3 className="font-display text-xl leading-tight">{subject.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {done} of {subject.topics.length} finished
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Choose your four subjects in your profile to see them here.</p>
      )}

      <h2 className="mt-10 font-display text-3xl">Practice modes</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Link to="/studio/subjects" className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">Open</p>
          <h3 className="mt-1 font-display text-xl">Topic quizzes</h3>
          <p className="mt-2 text-sm text-muted">
            Short sets built from the published question bank for your subjects.
          </p>
        </Link>
        <Link to="/studio/cbt" className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">Open</p>
          <h3 className="mt-1 font-display text-xl">JAMB CBT</h3>
          <p className="mt-2 text-sm text-muted">
            A timed 180-question paper when the verified bank is complete.
          </p>
        </Link>
      </div>
    </div>
  );
}
