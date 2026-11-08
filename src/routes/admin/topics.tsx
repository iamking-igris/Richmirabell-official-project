import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { Topic } from "@/data/catalog";
import { groupByMainTopic, useContent } from "@/lib/content";
import { useNoteStore } from "@/lib/useNoteStore";

export const Route = createFileRoute("/admin/topics")({
  validateSearch: (search: Record<string, unknown>) => ({ subject: typeof search.subject === "string" ? search.subject : "" }),
  component: Topics,
});

const NAMES: Record<string, string> = {
  mathematics: "Mathematics",
  english: "Use of English",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

function Topics() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/admin/topics/") && path !== "/admin/topics") return <Outlet />;
  const { subject: subjectId } = Route.useSearch();
  const subjects = useContent((s) => s.subjects);
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects.find((s) => s.id === "physics");
  const upsertTopic = useContent((s) => s.upsertTopic);
  const removeTopic = useContent((s) => s.removeTopic);
  const removeMainTopic = useContent((s) => s.removeMainTopic);
  const removeNotesForTopics = useNoteStore((s) => s.removeNotesForTopics);
  const navigate = useNavigate();
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [parent, setParent] = useState("");
  const [emptyGroups, setEmptyGroups] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    type: "main" | "sub" | "empty";
    id: string;
    title: string;
    subtopicCount?: number;
    topicObj?: Topic;
  } | null>(null);

  if (!subject) return <p>Subject not found.</p>;
  const current = subject;
  const groups = groupByMainTopic(current.topics);
  const extras = emptyGroups.filter((name) => !groups.some((g) => g.main === name));
  const ready = current.topics.some((t) => t.status !== "draft" && t.notes.length > 0);

  function addMain(e: React.FormEvent) {
    e.preventDefault();
    const name = main.trim();
    if (!name) return;
    if (groups.some((g) => g.main.toLowerCase() === name.toLowerCase()) || emptyGroups.includes(name)) {
      setError("That main topic already exists.");
      return;
    }
    setEmptyGroups((current) => [...current, name]);
    setParent(name);
    setMain("");
    setError("");
  }

  function addSub(e: React.FormEvent) {
    e.preventDefault();
    const name = sub.trim();
    if (!name || !parent) { setError("Name the subtopic and pick a main topic."); return; }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (current.topics.some((t) => t.id === id)) { setError("A topic with that name already exists."); return; }
    upsertTopic(current.id, {
      id, title: name, minutes: 12, summary: "", status: "draft", notes: [], questions: [], mainTopic: parent,
    });
    setEmptyGroups((groups) => groups.filter((g) => g !== parent));
    setSub("");
    setError("");
  }

  return (
    <div>
      <p className="text-sm text-muted"><Link to="/admin/subjects" className="text-primary">Subjects & Content</Link> / {NAMES[current.id] ?? current.name}</p>
      <h1 className="mt-2 font-display text-4xl">{NAMES[current.id] ?? current.name}</h1>
      <p className="mt-2 text-sm text-muted">Add a main topic, then add subtopics under it. Students see the same grouping.</p>
      <p className="mt-1 text-sm">{ready ? "Available" : "Not Available"} · {current.topics.length} subtopics</p>

      <form onSubmit={addMain} className="mt-5 flex gap-2">
        <input value={main} onChange={(e) => setMain(e.target.value)} placeholder="New main topic, e.g. Waves" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
        <button className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-primary-fg">Add main topic</button>
      </form>
      <form onSubmit={addSub} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={parent} onChange={(e) => setParent(e.target.value)} className="min-h-11 rounded-xl border border-line bg-surface px-3">
          <option value="">Under which main topic</option>
          {[...groups.map((g) => g.main), ...extras].map((name) => <option key={name}>{name}</option>)}
        </select>
        <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="New subtopic" className="min-h-11 rounded-xl border border-line bg-surface px-3" />
        <button className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg">Add subtopic</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {groups.map(({ main, items }) => (
          <section key={main} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="font-display text-2xl">{main}</h2>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModal({ type: "main", id: main, title: main, subtopicCount: items.length });
                }}
                aria-label={`Delete topic ${main}`}
                title={`Delete topic ${main}`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <ul className="divide-y divide-line">
              {items.map((topic) => {
                const live = topic.status !== "draft" && topic.notes.length > 0;
                return (
                  <li key={topic.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p className="font-medium">{topic.title}</p>
                      <p className="text-sm text-muted">
                        Notes {topic.notes.length ? "prepared" : "not prepared"} · Quiz {topic.questions.length ? `${topic.questions.length} questions` : "not prepared"} · {live ? "Available" : "Draft"}
                      </p>
                    </div>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => upsertTopic(current.id, { ...topic, status: topic.status === "draft" ? "published" : "draft" })} className="min-h-9 rounded-full border border-line px-3 text-sm">
                        {topic.status === "draft" ? "Publish" : "Unpublish"}
                      </button>
                      <button type="button" onClick={() => navigate({ to: "/admin/topics/$id", params: { id: topic.id }, search: { subject: current.id } })} className="min-h-9 rounded-full bg-primary px-3 text-sm font-semibold text-primary-fg">Open</button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ type: "sub", id: topic.id, title: topic.title, topicObj: topic });
                        }}
                        className="min-h-9 rounded-full border border-line px-3 text-sm text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {extras.map((name) => (
          <section key={name} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-line bg-surface p-4">
            <div>
              <h2 className="font-display text-2xl">{name}</h2>
              <p className="mt-1 text-sm text-muted">No subtopics yet. Add one under this main topic.</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ type: "empty", id: name, title: name });
              }}
              aria-label={`Delete topic ${name}`}
              title={`Delete topic ${name}`}
              className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
            >
              <Trash2 className="size-4" />
            </button>
          </section>
        ))}
        {groups.length === 0 && extras.length === 0 && <p className="text-sm text-muted">No topics yet. Add a main topic first.</p>}
      </div>

      {/* In-App Deletion Confirmation Modal Dialog */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title" className="font-display text-2xl text-ink">
              {deleteModal.type === "main" || deleteModal.type === "empty"
                ? "Delete Main Topic?"
                : "Delete Subtopic?"}
            </h3>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              {deleteModal.type === "main" && (
                <>
                  Are you sure you want to delete <strong className="text-ink">{deleteModal.title}</strong>?
                  <br /><br />
                  This will permanently delete this main topic and all {deleteModal.subtopicCount} subtopic(s) under it, including all associated lesson notes, learning objectives, quiz questions, answer options, explanations, and study materials.
                </>
              )}
              {deleteModal.type === "empty" && (
                <>
                  Are you sure you want to delete the main topic <strong className="text-ink">{deleteModal.title}</strong>?
                </>
              )}
              {deleteModal.type === "sub" && (
                <>
                  Are you sure you want to delete subtopic <strong className="text-ink">{deleteModal.title}</strong>?
                  <br /><br />
                  This will permanently delete only this subtopic and its associated lesson notes, learning objectives, quiz questions, and study materials. The parent main topic will be preserved.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="min-h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-paper transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteModal.type === "main") {
                    const targetSubtopicIds = current.topics
                      .filter((t) => (t.mainTopic ?? "Topics").trim().toLowerCase() === deleteModal.id.trim().toLowerCase())
                      .map((t) => t.id);
                    removeMainTopic(current.id, deleteModal.id);
                    removeNotesForTopics(targetSubtopicIds);
                    setEmptyGroups((prev) => prev.filter((g) => g !== deleteModal.id));
                    if (parent === deleteModal.id) setParent("");
                  } else if (deleteModal.type === "empty") {
                    setEmptyGroups((prev) => prev.filter((g) => g !== deleteModal.id));
                    if (parent === deleteModal.id) setParent("");
                  } else if (deleteModal.type === "sub" && deleteModal.topicObj) {
                    const topic = deleteModal.topicObj;
                    const parentName = topic.mainTopic ?? "Topics";
                    const siblingCount = current.topics.filter(
                      (t) => (t.mainTopic ?? "Topics").trim().toLowerCase() === parentName.trim().toLowerCase()
                    ).length;
                    if (siblingCount === 1) {
                      setEmptyGroups((prev) => (prev.includes(parentName) ? prev : [...prev, parentName]));
                    }
                    removeTopic(current.id, topic.id);
                    removeNotesForTopics([topic.id]);
                  }
                  setDeleteModal(null);
                }}
                className="min-h-10 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
