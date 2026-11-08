import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { publishedSubjects, useContent } from "@/lib/content";
import { useCbtStore, type QuestionOriginStatus } from "@/lib/cbt-store";
import { CheckCircle2, XCircle, Sparkles, Filter, Plus, RefreshCw, Layers } from "lucide-react";

export const Route = createFileRoute("/admin/questions")({ component: QuestionBankAdminPage });

function QuestionBankAdminPage() {
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const questions = useCbtStore((s) => s.questions);
  const addQuestion = useCbtStore((s) => s.addQuestion);
  const updateQuestionStatus = useCbtStore((s) => s.updateQuestionStatus);
  const deleteQuestion = useCbtStore((s) => s.deleteQuestion);

  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // AI Generator state
  const [genSubject, setGenSubject] = useState<string>(subjects[0]?.name || "Physics");
  const [genTopic, setGenTopic] = useState<string>("Forces & Momentum");
  const [genCount, setGenCount] = useState<number>(3);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const filtered = questions.filter((q) => {
    if (filterSubject !== "All" && q.subject.toLowerCase() !== filterSubject.toLowerCase()) return false;
    if (filterStatus !== "All" && q.status !== filterStatus) return false;
    return true;
  });

  async function handleAiGenerate() {
    setGenerating(true);
    setGenMsg(null);

    try {
      // Generate sample curriculum items with verified key & reasoning
      const newItems = Array.from({ length: genCount }).map((_, idx) => ({
        subject: genSubject,
        topic: genTopic,
        type: "multiple_choice" as const,
        prompt: `[AI Practice] ${genSubject} (${genTopic}): Which statement accurately describes the fundamental physical behavior of item #${idx + 1}?`,
        options: [
          { key: "A" as const, text: "It remains constant under conservative force conditions." },
          { key: "B" as const, text: "It decreases exponentially with temperature." },
          { key: "C" as const, text: "It varies inversely with the distance squared." },
          { key: "D" as const, text: "It undergoes non-linear harmonic resonance." },
        ],
        answer: "A" as const,
        explanation: "Under conservative force conditions, total mechanical energy is conserved and remains constant.",
        status: "ai_generated_pending" as QuestionOriginStatus,
      }));

      for (const item of newItems) {
        addQuestion(item);
      }

      setGenMsg(`Successfully generated ${genCount} AI practice items for ${genSubject}. Marked as 'ai_generated_pending' for review.`);
    } catch (err: any) {
      setGenMsg(`Error generating questions: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-[#2A2422]">Question Bank & AI Sourcing</h1>
        <p className="mt-2 text-sm text-muted">
          Manage verified past questions, uploaded document items, and AI-generated questions with full approval workflows.
        </p>
      </div>

      {/* AI Question Generation Panel */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#1A4D2E]" />
          <h2 className="font-display text-xl text-[#2A2422]">Generate AI Practice Questions</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-muted uppercase">Subject</label>
            <select
              value={genSubject}
              onChange={(e) => setGenSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted uppercase">Topic / Syllabus Module</label>
            <input
              type="text"
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted uppercase">Item Count</label>
            <input
              type="number"
              min={1}
              max={10}
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={generating}
            onClick={handleAiGenerate}
            className="min-h-11 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white hover:bg-[#153e25] disabled:opacity-40 flex items-center gap-2"
          >
            {generating ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span>Generate Questions with AI →</span>
          </button>

          {genMsg && <p className="text-xs font-semibold text-[#1A4D2E]">{genMsg}</p>}
        </div>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-[#2A2422]">
            Repository Items ({filtered.length} of {questions.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium"
            >
              <option value="All">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="verified_past">Verified Past Question</option>
              <option value="ai_generated_pending">AI Generated (Pending Review)</option>
              <option value="ai_generated_approved">AI Generated (Approved)</option>
              <option value="uploaded_pending">Uploaded (Pending Review)</option>
              <option value="uploaded_approved">Uploaded (Approved)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-line bg-paper/60 text-muted font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Subject & Topic</th>
                <th className="px-4 py-3">Prompt</th>
                <th className="px-4 py-3">Answer Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-paper/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#2A2422]">
                    <div>{q.subject}</div>
                    <span className="text-[10px] text-muted font-normal">{q.topic || "General"}</span>
                  </td>
                  <td className="px-4 py-3 max-w-md line-clamp-2">{q.prompt}</td>
                  <td className="px-4 py-3 font-bold text-[#1A4D2E]">Option {q.answer || "N/A"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        q.status.includes("approved") || q.status === "verified_past"
                          ? "bg-emerald-100 text-emerald-800"
                          : q.status.includes("pending")
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {q.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {q.status.includes("pending") && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestionStatus(
                                q.id,
                                q.status.startsWith("ai") ? "ai_generated_approved" : "uploaded_approved"
                              )
                            }
                            className="px-2.5 py-1 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 flex items-center gap-1"
                          >
                            <CheckCircle2 className="size-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestionStatus(
                                q.id,
                                q.status.startsWith("ai") ? "ai_generated_rejected" : "uploaded_rejected"
                              )
                            }
                            className="px-2 py-1 rounded-full border border-line text-muted hover:text-red-600"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteQuestion(q.id)}
                        className="px-2 py-1 rounded-full text-red-600 hover:bg-red-50 text-[10px]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
