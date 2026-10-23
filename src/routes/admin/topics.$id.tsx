import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Choice, NoteBlock, Question, Subject, Topic } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { locateTopic, useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/topics/$id")({ component: Editor });

const field = "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-3";
const KEYS: Choice[] = ["A", "B", "C", "D"];

function Editor() {
  const { id } = Route.useParams();
  const subjects = useContent((s) => s.subjects);
  const found = locateTopic(subjects, id);
  if (!found) return <p>That topic is not on Richmirabel.</p>;
  return <Form key={id} subject={found.subject} initial={found.topic} />;
}

function validate(t: Topic): string | null {
  if (!t.title.trim()) return "Add a title.";
  if (t.notes.length === 0) return "Add at least one note block.";
  const bad = t.notes.findIndex((b) => !b.heading.trim() || b.paragraphs.length === 0);
  if (bad >= 0) return `Note block ${bad + 1} needs a heading and a paragraph.`;
  if (t.status !== "draft") {
    if (t.questions.length < 4) return "Add at least 4 questions before publishing.";
    for (let i = 0; i < t.questions.length; i++) {
      const q = t.questions[i];
      if (!q.prompt.trim()) return `Question ${i + 1} has no prompt.`;
      if (q.options.some((o) => !o.text.trim())) return `Question ${i + 1} has an empty option.`;
      if (!q.explain?.trim()) return `Question ${i + 1} has no explanation.`;
    }
  }
  return null;
}

function Form({ subject, initial }: { subject: Subject; initial: Topic }) {
  const upsert = useContent((s) => s.upsertTopic);
  const [topic, setTopic] = useState<Topic>(structuredClone(initial));
  const [tab, setTab] = useState<"Details" | "Note" | "Questions">("Details");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const edit = (patch: Partial<Topic>) => { setTopic((t) => ({ ...t, ...patch })); setDirty(true); setMsg(null); };
  const setBlock = (i: number, patch: Partial<NoteBlock>) => edit({ notes: topic.notes.map((b, k) => (k === i ? { ...b, ...patch } : b)) });
  const move = <T,>(list: T[], i: number, d: number) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; };
  const setQ = (i: number, patch: Partial<Question>) => edit({ questions: topic.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) });

  function save(status: "published" | "draft") {
    const next = { ...topic, status };
    const err = validate(next);
    if (err) { setMsg({ ok: false, text: err }); return; }
    upsert(subject.id, next);
    setTopic(next);
    setDirty(false);
    setMsg({ ok: true, text: status === "published" ? "Published." : "Saved." });
  }

  return (
    <div className="max-w-3xl">
      <Link to="/admin/topics" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">All topics</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{subject.name}</p>
          <h1 className="font-display text-4xl">{topic.title || "Untitled topic"}</h1>
        </div>
        <p className="text-sm text-muted">{topic.status === "draft" ? "Draft" : "Published"}{dirty ? " · unsaved changes" : ""}</p>
      </div>

      <div className="mt-5 flex gap-2" role="tablist">
        {(["Details", "Note", "Questions"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("min-h-11 rounded-full border px-5 text-sm font-semibold", tab === t ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface")}>
            {t}{t === "Questions" ? ` (${topic.questions.length})` : t === "Note" ? ` (${topic.notes.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "Details" && (
        <div className="mt-5 space-y-4">
          <label className="block text-sm">Title<input value={topic.title} onChange={(e) => edit({ title: e.target.value })} className={field} /></label>
          <label className="block text-sm">One-line summary<input value={topic.summary} onChange={(e) => edit({ summary: e.target.value })} className={field} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Minutes to read<input type="number" min={1} value={topic.minutes} onChange={(e) => edit({ minutes: Math.max(1, Number(e.target.value) || 1) })} className={field} /></label>
            <label className="block text-sm">Diagram
              <select value={topic.diagram ?? ""} onChange={(e) => edit({ diagram: (e.target.value || undefined) as Topic["diagram"] })} className={field}>
                <option value="">None</option><option value="wave">Wave</option><option value="cell">Cell</option><option value="balance">Balance</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {tab === "Note" && (
        <div className="mt-5 space-y-4">
          {topic.notes.map((b, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Block {i + 1}</p>
                <div className="flex">
                  <button type="button" aria-label="Move up" onClick={() => edit({ notes: move(topic.notes, i, -1) })} className="inline-flex size-11 items-center justify-center"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label="Move down" onClick={() => edit({ notes: move(topic.notes, i, 1) })} className="inline-flex size-11 items-center justify-center"><ArrowDown className="size-4" /></button>
                  <button type="button" aria-label="Delete block" onClick={() => { if (confirm(`Delete block ${i + 1}?`)) edit({ notes: topic.notes.filter((_, k) => k !== i) }); }} className="inline-flex size-11 items-center justify-center"><Trash2 className="size-4" /></button>
                </div>
              </div>
              <label className="mt-2 block text-sm">Heading<input value={b.heading} onChange={(e) => setBlock(i, { heading: e.target.value })} className={field} /></label>
              <label className="mt-3 block text-sm">Paragraphs (blank line between each)
                <textarea rows={5} value={b.paragraphs.join("\n\n")} onChange={(e) => setBlock(i, { paragraphs: e.target.value.split(/\n\n+/).map((x) => x.trim()).filter(Boolean) })} className={field} />
              </label>
              <label className="mt-3 block text-sm">Formula (optional)<input value={b.formula ?? ""} onChange={(e) => setBlock(i, { formula: e.target.value || undefined })} className={field} /></label>
              <label className="mt-3 block text-sm">Bullet points (one per line, optional)
                <textarea rows={3} value={(b.points ?? []).join("\n")} onChange={(e) => setBlock(i, { points: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className={field} />
              </label>
            </div>
          ))}
          <button type="button" onClick={() => edit({ notes: [...topic.notes, { heading: "", paragraphs: [] }] })} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold"><Plus className="size-4" />Add block</button>
        </div>
      )}

      {tab === "Questions" && (
        <div className="mt-5 space-y-4">
          {topic.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Question {i + 1}</p>
                <div className="flex">
                  <button type="button" aria-label="Move up" onClick={() => edit({ questions: move(topic.questions, i, -1) })} className="inline-flex size-11 items-center justify-center"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label="Move down" onClick={() => edit({ questions: move(topic.questions, i, 1) })} className="inline-flex size-11 items-center justify-center"><ArrowDown className="size-4" /></button>
                  <button type="button" aria-label="Delete question" onClick={() => { if (confirm(`Delete question ${i + 1}?`)) edit({ questions: topic.questions.filter((_, k) => k !== i) }); }} className="inline-flex size-11 items-center justify-center"><Trash2 className="size-4" /></button>
                </div>
              </div>
              <label className="mt-2 block text-sm">Prompt<textarea rows={2} value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} className={field} /></label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <label key={o.key} className="block text-sm">Option {o.key}
                    <input value={o.text} onChange={(e) => setQ(i, { options: q.options.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)) })} className={field} />
                  </label>
                ))}
              </div>
              <fieldset className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <legend className="mb-1">Correct answer</legend>
                {KEYS.map((k) => (
                  <label key={k} className={cn("flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-4", q.answer === k ? "border-primary bg-primary text-primary-fg" : "border-line")}>
                    <input type="radio" name={`ans-${q.id}`} checked={q.answer === k} onChange={() => setQ(i, { answer: k })} className="sr-only" />{k}
                  </label>
                ))}
              </fieldset>
              <label className="mt-3 block text-sm">Explanation<textarea rows={2} value={q.explain} onChange={(e) => setQ(i, { explain: e.target.value })} className={field} /></label>
            </div>
          ))}
          <button type="button" onClick={() => edit({ questions: [...topic.questions, { id: `${topic.id}-q${Date.now().toString(36)}`, prompt: "", options: KEYS.map((key) => ({ key, text: "" })), answer: "A", explain: "" }] })} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold"><Plus className="size-4" />Add question</button>
        </div>
      )}

      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <button type="button" onClick={() => save("published")} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Publish</button>
        <button type="button" onClick={() => save("draft")} className="min-h-12 rounded-full border border-line bg-surface px-6 font-semibold">Save as draft</button>
        <p role="status" aria-live="polite" className={cn("text-sm", msg && !msg.ok && "font-semibold")}>{msg?.text}</p>
      </div>
    </div>
  );
}
