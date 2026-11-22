import { createFileRoute, Link } from "@tanstack/react-router";
import { publishedSubjects, useContent } from "@/lib/content";
import { photoOf } from "@/lib/format";
import { useSession } from "@/lib/session";
import { PageCardSkeleton } from "@/lib/admin-ui";

export const Route = createFileRoute("/studio/subjects")({ component: SubjectsPage });

function SubjectsPage() {
  const all = publishedSubjects(useContent((s) => s.subjects));
  const loading = useContent((s) => s.loading);
  const error = useContent((s) => s.error);
  const selected = useSession((s) => s.selectedSubjects);
  const mine = (selected.length ? selected : all.map((subject) => subject.id))
    .map((id) => all.find((subject) => subject.id === id))
    .filter((subject): subject is NonNullable<typeof subject> => Boolean(subject));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl">Your subjects</h1>
      <p className="mt-2 text-muted">
        These are the subjects saved to your profile. Open one to see its published topics.
      </p>

      {loading && !all.length ? (
        <PageCardSkeleton cards={5} />
      ) : error && !all.length ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">Could not load subjects</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => void useContent.getState().refresh().catch(() => undefined)}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Try again
          </button>
        </div>
      ) : mine.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">No subjects saved yet.</p>
          <Link
            to="/studio/profile"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Choose your subjects
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {mine.map((subject) => (
            <Link
              key={subject.id}
              to="/studio/subject/$id"
              params={{ id: subject.id }}
              className="flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <img src={photoOf(subject)} alt="" className="h-28 w-28 object-cover sm:h-32 sm:w-36" />
              <span className="flex flex-col justify-center py-3 pr-4">
                <span className="text-xs font-semibold text-primary">Your subject</span>
                <span className="font-display text-2xl">{subject.name}</span>
                <span className="mt-1 text-sm text-muted">
                  {subject.topics.length ? `${subject.topics.length} published topics` : "No published topics yet"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
