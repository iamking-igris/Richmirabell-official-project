import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { groupByMainTopic, publishedSubjects, useContent, visibleTopics } from "@/lib/content";
import { photoOf } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/subject/$id")({ component: SubjectPage });

function SubjectPage() {
  const { id } = Route.useParams();
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const subject = subjects.find((s) => s.id === id);
  const best = bestByTopic(useSession((s) => s.attempts));
  const demoMode = useSession((s) => s.demoMode);

  if (!subject) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">Subject not found</h1>
        <Link to="/studio" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Back to dashboard</Link>
      </div>
    );
  }
  const topics = visibleTopics(subject.topics, demoMode);
  const groups = groupByMainTopic(topics);
  const demoCount = topics.filter((t) => t.origin === "demo").length;

  return (
    <div>
      <Link to="/studio" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Dashboard</Link>
      <div className="relative mt-4 overflow-hidden rounded-3xl">
        <img src={photoOf(subject)} alt="" className="aspect-[16/7] w-full object-cover sm:aspect-[21/7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-primary-fg sm:p-7">
          <p className="text-sm font-semibold text-primary-fg/80">{subject.exam}</p>
          <h1 className="font-display text-4xl sm:text-5xl">{subject.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-primary-fg/85">{subject.blurb}</p>
        </div>
      </div>
      {demoMode && demoCount > 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-line bg-soft/60 px-4 py-3 text-sm text-muted">
          Demo mode is on. {demoCount} synthetic subtopic{demoCount === 1 ? "" : "s"} are included for testing and are labelled DEMO. They are not teacher-approved content.
        </p>
      )}
      <div className="mt-6 space-y-6">
        {groups.map(({ main, items }) => (
          <section key={main}>
            <h2 className="font-display text-2xl">{main}</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {items.map((topic, index) => {
                const attempt = best.get(topic.id);
                return (
                  <li key={topic.id}>
                    <Link to="/studio/topic/$id" params={{ id: topic.id }} className="flex min-h-16 items-center gap-4 px-4 py-4 hover:bg-paper sm:px-5">
                      <span className="w-6 text-sm text-muted">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{topic.title}{topic.origin === "demo" ? <span className="ml-2 rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-muted">DEMO</span> : null}</span>
                        <span className="block truncate text-sm text-muted">{topic.summary}</span>
                      </span>
                      <span className="shrink-0 text-right text-sm">
                        {attempt ? <span className="inline-flex items-center gap-1 font-semibold text-primary"><Check className="size-4" aria-hidden />Best {attempt.score}/{attempt.total}</span> : <span className="text-muted">{topic.minutes} min</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
