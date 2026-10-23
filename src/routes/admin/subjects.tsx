import { createFileRoute } from "@tanstack/react-router";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/subjects")({ component: Subjects });

function Subjects() {
  const subjects = useContent((s) => s.subjects);
  return (
    <div>
      <h1 className="font-display text-4xl">Subjects</h1>
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
        {subjects.map((s) => (
          <li key={s.id} className="flex justify-between px-4 py-3">
            <span className="font-medium">{s.name}</span>
            <span className="text-sm text-muted">{s.topics.length} topics</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
