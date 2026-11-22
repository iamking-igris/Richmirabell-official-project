import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useContent } from "@/lib/content";
import { contentApi } from "@/lib/backend";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/admin/notes")({ component: NotesPage });

function NotesPage() {
  const subjects = useContent((s) => s.subjects);
  const loading = useContent((s) => s.loading);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await useContent.getState().refresh({ includeDrafts: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh content.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <h1 className="font-display text-3xl">Loading lessons…</h1>
      </div>
    );
  }

  const topics = subjects.flatMap((subject) =>
    subject.topics.map((topic) => ({ subject, topic })),
  );
  const drafts = topics.filter((t) => t.topic.status === "draft");
  const published = topics.filter((t) => t.topic.status === "published");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Lessons & notes</h1>
          <p className="mt-2 text-sm text-muted">
            All backend topics, including drafts. Open a topic to edit its note or publish it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={refresh}
            className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh from backend"}
          </button>
          <Link
            to="/admin/subjects"
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Manage subjects
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Published</p>
          <p className="mt-1 font-display text-2xl">{published.length}</p>
          <p className="text-xs text-muted">visible to students</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Drafts</p>
          <p className="mt-1 font-display text-2xl">{drafts.length}</p>
          <p className="text-xs text-muted">not visible to students</p>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="font-display text-2xl">No lessons yet.</p>
          <p className="mt-1 text-sm text-muted">Create topics in the content editor.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {topics.map(({ subject, topic }) => (
            <li key={topic.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{topic.title}</p>
                <p className="text-xs text-muted truncate">
                  {subject.name} · {topic.status === "published" ? "Published" : "Draft"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/admin/topics/$id"
                  params={{ id: topic.id }}
                  className="min-h-10 rounded-full border border-line px-3 text-xs font-semibold hover:bg-paper"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
