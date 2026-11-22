import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AlertCircle, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Topic } from "@/data/catalog";
import { contentApi } from "@/lib/backend";
import { apiErrorMessage } from "@/lib/content-errors";
import { groupByMainTopic, useContent } from "@/lib/content";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/topics")({
  validateSearch: (search: Record<string, unknown>) => ({
    subject: typeof search.subject === "string" ? search.subject : "",
  }),
  component: Topics,
});

type DeleteTarget =
  | { type: "main"; name: string; count: number }
  | { type: "topic"; topic: Topic };

function Topics() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { subject: subjectId } = Route.useSearch();
  const subjects = useContent((s) => s.subjects);
  const loading = useContent((s) => s.loading);
  const loadError = useContent((s) => s.error);
  const refresh = useContent((s) => s.refresh);
  const navigate = useNavigate();

  // All hooks must run unconditionally before any early return.
  const [main, setMain] = useState("");
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    void refresh({ includeDrafts: true }).catch(() => undefined);
  }, [refresh]);

  const isNestedTopicRoute = path.startsWith("/admin/topics/") && path !== "/admin/topics";
  if (isNestedTopicRoute) return <Outlet />;

  const subject =
    subjects.find((item) => item.id === subjectId) ??
    subjects.find((item) => item.id === "physics") ??
    subjects[0];

  if (!subject) {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface p-12 text-center">
          <Loader2 className="size-8 animate-spin text-[#1A4D2E]" />
          <p className="mt-3 text-sm text-muted">Loading subjects and topics…</p>
        </div>
      );
    }
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
        <AlertCircle className="mx-auto size-9 text-muted" />
        <h1 className="mt-3 font-serif text-2xl font-bold text-ink">No subjects available</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          {loadError ?? "The backend did not return any subjects. Subjects are provisioned by the backend."}
        </p>
        <button
          type="button"
          onClick={() => void refresh({ includeDrafts: true })}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E] px-4 py-2 text-xs font-semibold text-white"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    );
  }

  const groups = groupByMainTopic(subject.topics);
  const publishedCount = subject.topics.filter((topic) => topic.status === "published").length;
  const draftCount = subject.topics.length - publishedCount;
  const mainNames = groups.map((group) => group.main);

  async function addTopic(event: React.FormEvent) {
    event.preventDefault();
    if (!subject) return;
    if (!title.trim()) {
      setFormError("Add a subtopic title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      await contentApi.createTopic(subject.id, {
        title: title.trim(),
        main_topic: main.trim() || null,
        status: "DRAFT",
      });
      setTitle("");
      setMain("");
      setNotice("Draft topic created. Open it to add notes, objectives and questions.");
      await refresh({ includeDrafts: true });
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not create this topic."));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(topic: Topic) {
    if (!subject) return;
    setBusyId(topic.id);
    setFormError(null);
    setNotice(null);
    try {
      if (topic.status === "published") {
        await contentApi.unpublishTopic(topic.id);
        setNotice(`"${topic.title}" unpublished and hidden from students.`);
      } else {
        await contentApi.publishTopic(topic.id);
        setNotice(`"${topic.title}" published.`);
      }
      await refresh({ includeDrafts: true });
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not change this topic's status."));
    } finally {
      setBusyId(null);
    }
  }

  async function removeTopic(topic: Topic) {
    if (!subject || busyId) return;
    setBusyId(topic.id);
    setFormError(null);
    setNotice(null);
    useContent.getState().removeTopic(subject.id, topic.id);
    setDeleteTarget(null);
    try {
      await contentApi.deleteTopic(topic.id);
      setNotice(`"${topic.title}" deleted.`);
      void refresh({ includeDrafts: true }).catch(() => undefined);
    } catch (err) {
      useContent.getState().upsertTopic(subject.id, topic);
      setFormError(apiErrorMessage(err, "Could not delete this topic. Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  async function removeMainTopic(name: string) {
    if (!subject || busyId) return;
    setBusyId(`main:${name}`);
    setFormError(null);
    setNotice(null);
    const removedTopics = subject.topics.filter((topic) => (topic.mainTopic ?? "Topics").trim().toLowerCase() === name.trim().toLowerCase());
    useContent.getState().removeMainTopic(subject.id, name);
    setDeleteTarget(null);
    try {
      const result = await contentApi.deleteMainTopic(subject.id, name);
      setNotice(`"${name}" deleted${result.deleted ? ` with ${result.deleted} topic(s)` : ""}.`);
      void refresh({ includeDrafts: true }).catch(() => undefined);
    } catch (err) {
      for (const topic of removedTopics) useContent.getState().upsertTopic(subject.id, topic);
      setFormError(apiErrorMessage(err, "Could not delete this main topic. Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        <Link to="/admin/subjects" className="text-primary">
          Subjects &amp; Content
        </Link>{" "}
        / {subject.name}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-2 font-display text-4xl">{subject.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Create draft topics, then open each one to add lesson notes and questions. Publishing is
            always an explicit action.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh({ includeDrafts: true })}
          disabled={loading}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </button>
      </div>

      <p className="text-sm">
        <strong>{publishedCount}</strong> published · <strong>{draftCount}</strong> draft ·{" "}
        {subject.topics.length} topic(s)
      </p>

      {loadError && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}
      {formError && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          {notice}
        </div>
      )}

      <form
        onSubmit={addTopic}
        className="grid gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="text-xs font-semibold text-muted">
          Main topic (optional)
          <input
            list="main-topic-options"
            value={main}
            onChange={(event) => setMain(event.target.value)}
            placeholder="e.g. Waves"
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-primary"
          />
          <datalist id="main-topic-options">
            {mainNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label className="text-xs font-semibold text-muted">
          New subtopic title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Wave equation"
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 self-end rounded-full bg-[#1A4D2E] px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add draft topic
        </button>
      </form>

      {loading && subject.topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface p-12 text-center">
          <Loader2 className="size-8 animate-spin text-[#1A4D2E]" />
          <p className="mt-3 text-sm text-muted">Loading topics…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
          <h2 className="font-display text-2xl">No topics yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Add the first draft topic above. It will stay hidden from students until you publish it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ main: mainName, items }) => (
            <section key={mainName} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <h2 className="font-display text-2xl">{mainName}</h2>
                  <p className="text-xs text-muted">
                    {items.filter((topic) => topic.status === "published").length} published ·{" "}
                    {items.filter((topic) => topic.status !== "published").length} draft
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: "main", name: mainName, count: items.length })}
                  aria-label={`Delete main topic ${mainName}`}
                  title={`Delete main topic ${mainName}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <ul className="divide-y divide-line">
                {items.map((topic) => {
                  const published = topic.status === "published";
                  const busy = busyId === topic.id;
                  return (
                    <li
                      key={topic.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    >
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                          {topic.title}
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              published
                                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                : "border-slate-300 bg-slate-100 text-slate-700",
                            )}
                          >
                            {published ? "Published" : "Draft"}
                          </span>
                        </p>
                        <p className="text-sm text-muted">
                          Notes {topic.notes.length ? "prepared" : "not prepared"} · Quiz{" "}
                          {topic.questions.length
                            ? `${topic.questions.length} question(s)`
                            : "not prepared"}
                        </p>
                      </div>
                      <span className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void togglePublish(topic)}
                          disabled={busy}
                          className={cn(
                            "min-h-9 rounded-full px-3 text-sm font-semibold disabled:opacity-50",
                            published
                              ? "border border-line bg-surface text-muted hover:text-ink"
                              : "bg-emerald-700 text-white hover:bg-emerald-800",
                          )}
                        >
                          {busy ? "Working…" : published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: "/admin/topics/$id",
                              params: { id: topic.id },
                              search: { subject: subject.id },
                            })
                          }
                          className="min-h-9 rounded-full bg-primary px-3 text-sm font-semibold text-primary-fg"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: "topic", topic })}
                          disabled={busy}
                          className="min-h-9 rounded-full border border-line px-3 text-sm text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
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
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-topic-title"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-topic-title" className="font-display text-2xl text-ink">
              {deleteTarget.type === "main" ? "Delete main topic?" : "Delete subtopic?"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {deleteTarget.type === "main" ? (
                <>
                  Delete <strong className="text-ink">{deleteTarget.name}</strong> and all{" "}
                  {deleteTarget.count} topic(s) under it? This permanently removes their notes,
                  objectives, questions and theory.
                </>
              ) : (
                <>
                  Delete <strong className="text-ink">{deleteTarget.topic.title}</strong>? This
                  permanently removes its notes, objectives, questions and theory.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-paper"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTarget.type === "main") void removeMainTopic(deleteTarget.name);
                  else void removeTopic(deleteTarget.topic);
                }}
                className="min-h-10 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
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
