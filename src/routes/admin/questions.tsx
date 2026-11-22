import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { contentApi } from "@/lib/backend";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/admin/questions")({ component: QuestionBankAdminPage });

type TopicQuestionCount = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicTitle: string;
  questionCount: number;
  status: string;
};

export function QuestionBankAdminPage() {
  const [rows, setRows] = useState<TopicQuestionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const subjects = await contentApi.listSubjects();
        const rows: TopicQuestionCount[] = [];
        for (const subject of subjects) {
          try {
            const topics = await contentApi.listTopics(subject.id, false);
            for (const topic of topics) {
              const count = Array.isArray(topic.questions) ? topic.questions.length : 0;
              rows.push({
                subjectId: subject.id,
                subjectName: subject.name,
                topicId: topic.id,
                topicTitle: topic.title,
                questionCount: count,
                status: topic.status,
              });
            }
          } catch {
            // Skip subjects that cannot be listed; keep the page honest.
          }
        }
        if (!cancelled) setRows(rows.sort((a, b) => a.topicTitle.localeCompare(b.topicTitle)));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load the question bank.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <h1 className="font-display text-3xl">Loading question bank…</h1>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl">Could not load question bank</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Link
          to="/admin/subjects"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
        >
          Manage subjects & topics
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl">Question bank</h1>
      <p className="mt-2 max-w-xl text-muted">
        Questions are created and edited inside each topic editor. Use the list below to find topics that still need questions.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="font-display text-2xl">No topics with questions yet.</p>
          <p className="mt-1 text-sm text-muted">
            Open a topic in the content editor to add objective and theory questions.
          </p>
          <Link
            to="/admin/subjects"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Go to subjects
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-4 py-3 font-medium text-muted">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Topic</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Questions</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.topicId}>
                    <td className="px-4 py-3">{row.subjectName}</td>
                    <td className="px-4 py-3 font-medium">{row.topicTitle}</td>
                    <td className="px-4 py-3">{row.questionCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex min-h-8 items-center rounded-full px-2 text-xs font-medium",
                          row.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-soft text-ink border border-line",
                        ].join(" ")}
                      >
                        {row.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted">
            {plural(rows.length, "topic")} across subjects. Open a topic to add or edit its questions.
          </p>
        </>
      )}
    </div>
  );
}

function plural(n: number, one: string) {
  return `${n} ${n === 1 ? one : one + "s"}`;
}
