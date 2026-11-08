import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ClipboardList, FileUp } from "lucide-react";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/")({ component: Overview });

function Overview() {
  const subjects = useContent((s) => s.subjects);
  const topics = subjects.flatMap((s) => s.topics);
  const prepared = subjects.filter((s) => s.id === "physics" || s.topics.some((t) => t.status !== "draft" && t.notes.length > 0)).length;

  function statusOf(id: string, liveNotes: number) {
    if (id === "physics" || liveNotes > 0) return "Ready";
    if (liveNotes === 0 && id !== "physics") return "Being Prepared";
    return "Not Started";
  }

  return (
    <div>
      <header>
        <h1 className="font-display text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-xl text-muted">Manage your learning content, prepare subjects, and build practice experiences for students.</p>
      </header>

      <section className="mt-6 overflow-hidden rounded-3xl bg-ink px-6 py-8 text-primary-fg sm:px-8">
        <p className="text-xs font-semibold tracking-wide text-brass">Welcome back</p>
        <p className="mt-2 max-w-xl font-display text-2xl sm:text-3xl">Your Richmirabel learning workspace is ready. Continue preparing content and building meaningful practice experiences for students.</p>
      </section>

      <section className="mt-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Subjects in the workspace" value={subjects.length} />
          <Stat label="Topics across subjects" value={topics.length} />
          <Stat label="Ready for learning" value={prepared} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Quick Actions</h2>
        <p className="mt-1 text-sm text-muted">Continue working on the most important content tasks.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Action to="/admin/subjects" icon={<BookOpen className="size-5" aria-hidden />} title="Manage Subjects & Content" text="Organise subjects, topics, subtopics, learning notes, and topic quizzes." />
          <Action to="/admin/past-questions" icon={<FileUp className="size-5" aria-hidden />} title="Import Past Questions" text="Bring teacher-supplied past-question pages into the question bank for review." />
          <Action to="/admin/cbt" icon={<ClipboardList className="size-5" aria-hidden />} title="Build a CBT" text="Configure a practice test using available, verified questions." />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Subject Preparation</h2>
            <p className="mt-1 text-sm text-muted">See which subjects are ready and which are still being prepared.</p>
          </div>
          <Link to="/admin/subjects" className="text-sm font-semibold text-primary">View all subjects</Link>
        </div>
        {subjects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6">
            <p className="font-display text-2xl">No subjects yet.</p>
            <Link to="/admin/subjects" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Add the first subject</Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {subjects.slice(0, 6).map((subject) => {
              const liveNotes = subject.topics.filter((t) => t.status !== "draft" && t.notes.length > 0).length;
              const status = statusOf(subject.id, liveNotes);
              return (
                <li key={subject.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-sm text-muted">{subject.topics.length} topics · {status}</p>
                  </div>
                  <Link to="/admin/topics" search={{ subject: subject.id }} className="text-sm font-semibold text-primary">Open</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function Action({ to, icon, title, text }: { to: "/admin/subjects" | "/admin/past-questions" | "/admin/cbt"; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <span className="text-primary">{icon}</span>
      <p className="mt-3 font-display text-xl">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Link>
  );
}
