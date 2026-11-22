import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { groupByMainTopic, publishedSubjects, useContent } from "@/lib/content";
import { photoOf } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/subject/$id")({ component: SubjectPage });

function SubjectPage() {
  const { id } = Route.useParams();
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const loading = useContent((s) => s.loading);
  const error = useContent((s) => s.error);
  const subject = subjects.find((item) => item.id === id);
  const best = bestByTopic(useSession((s) => s.attempts));

  if (!subject) {
    if (loading) {
      return (
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl">Loading subject…</h1>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">{error ? "Could not load this subject" : "Subject not found"}</h1>
        <p className="mt-2 text-sm text-muted">
          {error || "It may not be published yet, or the link is out of date."}
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

  const groups = groupByMainTopic(subject.topics);

  return (
    <div>
      <Link to="/studio/subjects" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        Subjects
      </Link>
      <div className="relative mt-4 overflow-hidden rounded-3xl">
        <img src={photoOf(subject)} alt="" className="aspect-[16/7] w-full object-cover sm:aspect-[21/7]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-primary-fg sm:p-7">
          <p className="text-sm font-semibold text-primary-fg/80">{subject.exam}</p>
          <h1 className="font-display text-4xl sm:text-5xl">{subject.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-primary-fg/85">{subject.blurb}</p>
        </div>
      </div>

      {subject.topics.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">No published topics yet.</p>
          <p className="mt-1 text-sm text-muted">
            The content team has not published a lesson for this subject. Check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map(({ main, items }) => (
            <section key={main}>
              <h2 className="font-display text-2xl">{main}</h2>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {items.map((topic, index) => {
                  const attempt = best.get(topic.id);
                  return (
                    <li key={topic.id}>
                      <Link
                        to="/studio/topic/$id"
                        params={{ id: topic.id }}
                        className="flex min-h-16 items-center gap-4 px-4 py-4 hover:bg-paper sm:px-5"
                      >
                        <span className="w-6 text-sm text-muted">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{topic.title}</span>
                          <span className="block truncate text-sm text-muted">{topic.summary}</span>
                        </span>
                        <span className="shrink-0 text-right text-sm">
                          {attempt ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              <Check className="size-4" aria-hidden />
                              Best {attempt.score}/{attempt.total}
                            </span>
                          ) : (
                            <span className="text-muted">{topic.minutes} min</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
