import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/topics")({ component: Topics });

function Topics() {
  const subjects = useContent((s) => s.subjects);
  const upsertTopic = useContent((s) => s.upsertTopic);
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");

  return (
    <div>
      <h1 className="font-display text-4xl">Topics</h1>
      <form
        className="mt-6 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = title.trim();
          if (!name || !subjectId) return;
          const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          upsertTopic(subjectId, {
            id,
            title: name,
            minutes: 12,
            summary: "",
            status: "draft",
            notes: [],
            questions: [],
          });
          setTitle("");
          navigate({ to: "/admin/topics/$id", params: { id } });
        }}
      >
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-3">
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="New topic title" placeholder="Topic title, e.g. Simultaneous equations" className="min-w-48 flex-1 rounded-xl border border-line bg-surface px-3 py-3" />
        <button className="rounded-full bg-primary px-4 py-3 font-semibold text-primary-fg">New topic</button>
      </form>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {subjects.flatMap((subject) => subject.topics.map((topic) => (
          <li key={topic.id}>
            <Link to="/admin/topics/$id" params={{ id: topic.id }} className="flex items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="block font-medium">{topic.title}</span>
                <span className="text-sm text-muted">{subject.name} · {topic.questions.length} questions</span>
              </span>
              <span className="text-sm">{topic.status === "draft" ? "Draft" : "Published"}</span>
            </Link>
          </li>
        )))}
      </ul>
    </div>
  );
}
