import { createFileRoute, Link } from "@tanstack/react-router";
import { publishedSubjects, useContent } from "@/lib/content";
import { photoOf } from "@/lib/format";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/subjects")({ component: SubjectsPage });

function SubjectsPage() {
  const all = publishedSubjects(useContent((s) => s.subjects));
  const selected = useSession((s) => s.selectedSubjects);
  const mine = (selected.length ? selected : []).map((id) => all.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl">Your subjects</h1>
      <p className="mt-2 text-muted">These are the four subjects you chose. Other subjects stay off this page.</p>
      {mine.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <p className="font-display text-2xl">No subjects saved yet.</p>
          <Link to="/studio/profile" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Choose your subjects</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {mine.map((subject) => (
            <Link key={subject.id} to="/studio/subject/$id" params={{ id: subject.id }} className="flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface">
              <img src={photoOf(subject)} alt="" className="h-28 w-28 object-cover sm:h-32 sm:w-36" />
              <span className="flex flex-col justify-center py-3 pr-4">
                <span className="text-xs font-semibold text-primary">Your subject</span>
                <span className="font-display text-2xl">{subject.name}</span>
                <span className="mt-1 text-sm text-muted">{subject.topics.length} topics</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
