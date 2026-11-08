import { createFileRoute, Link } from "@tanstack/react-router";
import { Atom, BookOpen, Calculator, FlaskConical, Languages } from "lucide-react";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/subjects")({ component: Subjects });

const FIXED = [
  { id: "mathematics", name: "Mathematics", icon: Calculator },
  { id: "english", name: "Use of English", icon: Languages },
  { id: "physics", name: "Physics", icon: Atom },
  { id: "chemistry", name: "Chemistry", icon: FlaskConical },
  { id: "biology", name: "Biology", icon: BookOpen },
] as const;

function Subjects() {
  const all = useContent((s) => s.subjects);
  const fixed = FIXED.map((item) => all.find((s) => s.id === item.id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const prepared = fixed.filter((s) => s.topics.some((t) => t.status !== "draft" && t.notes.length > 0)).length;
  const topicTotal = fixed.reduce((n, s) => n + s.topics.length, 0);

  return (
    <div>
      <h1 className="font-display text-4xl">Subjects & Content</h1>
      <p className="mt-2 max-w-xl text-muted">Build Richmirabel's learning library. Organise topics, structure subtopics, and prepare notes and quizzes for students.</p>
      <p className="mt-2 text-sm text-muted">{prepared} prepared · {topicTotal} topics across the five subjects.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {FIXED.map((item) => {
          const subject = all.find((s) => s.id === item.id);
          const topics = subject?.topics ?? [];
          const ready = topics.some((t) => t.status !== "draft" && t.notes.length > 0);
          const Icon = item.icon;
          return (
            <li key={item.id} className="rounded-2xl border border-line bg-surface p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="mt-3 font-display text-2xl">{item.name}</p>
              <p className="mt-1 text-sm text-muted">{topics.length} topics · {ready ? "Available" : "Not Available"}</p>
              <Link to="/admin/topics" search={{ subject: item.id }} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg">
                Manage Content
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
