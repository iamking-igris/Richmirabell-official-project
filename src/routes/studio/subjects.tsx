import { createFileRoute, Link } from "@tanstack/react-router";
import { availableSubjects, useContent } from "@/lib/content";
import { photoOf } from "@/lib/format";

export const Route = createFileRoute("/studio/subjects")({ component: SubjectsPage });

function SubjectsPage() {
  const subjects = availableSubjects(useContent((s) => s.subjects));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl">Subjects</h1>
      <p className="mt-2 text-muted">All subject folders are open in demo mode, with notes and practice sets loaded for inspection.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <Link key={subject.id} to="/studio/subject/$id" params={{ id: subject.id }} className="flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface">
            <img src={photoOf(subject)} alt="" className="h-28 w-28 object-cover sm:h-32 sm:w-36" />
            <span className="flex flex-col justify-center py-3 pr-4">
              <span className="text-xs font-semibold text-primary">Available now</span>
              <span className="font-display text-2xl">{subject.name}</span>
              <span className="mt-1 text-sm text-muted">{subject.topics.length} topics · Open notes and quizzes</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
