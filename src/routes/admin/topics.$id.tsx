import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Trash2, Lightbulb, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Choice, NoteBlock as CatalogNoteBlock, Question, TheoryQuestion, TheoryPart, Subject, Topic } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { locateTopic, useContent } from "@/lib/content";
import { NotePreviewRenderer } from "@/components/NotePreviewRenderer";
import { useNoteStore } from "@/lib/useNoteStore";
import { extractNotesFromImage } from "@/lib/extract-notes";
import type { NoteBlock } from "@/lib/note-schema";
import { TopicQuizOcrWorkspace } from "@/components/question-ocr/TopicQuizOcrWorkspace";
import { getTheoryPartDepth, getTheoryIndentClass } from "@/lib/theory-hierarchy";

export const Route = createFileRoute("/admin/topics/$id")({ component: Editor });

const field = "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm font-sans text-ink focus:border-primary focus:outline-none transition-colors";
const KEYS: Choice[] = ["A", "B", "C", "D"];

function catalogNotesToDocBlocks(notes: CatalogNoteBlock[], objectives?: string[]): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  if (objectives && objectives.length > 0) {
    blocks.push({
      id: `obj-${Date.now()}`,
      type: "objectives",
      items: objectives,
    });
  }
  notes.forEach((n, idx) => {
    if (n.heading) {
      blocks.push({ id: `h-${idx}-${Date.now()}`, type: "heading", text: n.heading });
    }
    if (n.formula) {
      blocks.push({ id: `f-${idx}-${Date.now()}`, type: "formula", latex: n.formula });
    }
    (n.paragraphs || []).forEach((p, pIdx) => {
      blocks.push({ id: `p-${idx}-${pIdx}-${Date.now()}`, type: "paragraph", text: p });
    });
    if (n.diagramCaption) {
      blocks.push({ id: `d-${idx}-${Date.now()}`, type: "diagram", imageUrl: "/media/physics.jpg", caption: n.diagramCaption });
    }
  });
  return blocks;
}

function docBlocksToCatalogNotes(blocks: NoteBlock[]): { notes: CatalogNoteBlock[]; objectives: string[] } {
  const result: CatalogNoteBlock[] = [];
  let objectives: string[] = [];
  let current: CatalogNoteBlock | null = null;

  for (const b of blocks) {
    if (b.type === "objectives") {
      objectives = b.items.filter((item) => item.trim());
    } else if (b.type === "heading") {
      if (current && (current.heading?.trim() || current.paragraphs.length > 0 || current.formula || current.diagramCaption)) {
        result.push(current);
      }
      current = { heading: b.text || "", paragraphs: [] };
    } else if (b.type === "paragraph") {
      if (!current) current = { heading: "", paragraphs: [] };
      if (b.text.trim()) current.paragraphs.push(b.text.trim());
    } else if (b.type === "formula") {
      if (!current) current = { heading: "", paragraphs: [] };
      current.formula = b.latex;
    } else if (b.type === "diagram") {
      if (!current) current = { heading: "", paragraphs: [] };
      current.diagramCaption = b.caption;
    }
  }
  if (current && (current.heading?.trim() || current.paragraphs.length > 0 || current.formula || current.diagramCaption)) {
    result.push(current);
  }
  return {
    notes: result,
    objectives,
  };
}

function Editor() {
  const { id } = Route.useParams();
  const subjects = useContent((s) => s.subjects);
  const found = locateTopic(subjects, id);
  if (!found) return <p>That topic is not on Richmirabel.</p>;
  return <Form key={id} subject={found.subject} initial={found.topic} />;
}

function validate(t: Topic): string | null {
  if (!t.title.trim()) return "Add a title.";
  if (t.status !== "draft") {
    const hasBlocks = t.notes.length > 0 || (t.objectives && t.objectives.length > 0);
    if (!hasBlocks) return "Add at least one note block before publishing.";
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function Form({ subject, initial }: { subject: Subject; initial: Topic }) {
  const upsert = useContent((s) => s.upsertTopic);
  const [topic, setTopic] = useState<Topic>(structuredClone(initial));
  const [tab, setTab] = useState<"Details" | "Source" | "Note" | "Questions" | "Preview">("Details");
  const [sources, setSources] = useState<{ name: string; url: string; type: string; file: File }[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [sourceWorkflow, setSourceWorkflow] = useState<"notes" | "questions">("notes");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "objective" | "theory"; index: number; title: string } | null>(null);

  function handleImportTopicQuestions(imported: { questions: Question[]; theory?: TheoryQuestion[] }) {
    const newQs = imported.questions || [];
    const newTheory = imported.theory || [];

    setTopic((prev) => ({
      ...prev,
      questions: [...prev.questions, ...newQs],
      theory: [...(prev.theory || []), ...newTheory],
    }));
    setDirty(true);
    setMsg({
      ok: true,
      text: `Imported ${newQs.length} objective & ${newTheory.length} theory question(s) into Questions tab.`,
    });
  }

  // Zustand Note Store
  const doc = useNoteStore((s) => s.doc);
  const loadTopic = useNoteStore((s) => s.loadTopic);
  const setDocument = useNoteStore((s) => s.setDocument);
  const updateMeta = useNoteStore((s) => s.updateMeta);

  // Initialize and load topic in Zustand store on mount
  useEffect(() => {
    loadTopic(topic.id, {
      subject: subject.name,
      topic: topic.title.toUpperCase(),
      title: topic.title,
      subtitle: topic.summary || "",
      meta: `${topic.minutes || 10} min · ${topic.questions.length} questions · 2 theory`,
      blocks: catalogNotesToDocBlocks(topic.notes, topic.objectives),
    });
  }, [topic.id, subject.name, topic.title, topic.summary, topic.minutes, topic.questions.length, topic.objectives, loadTopic]);

  const edit = (patch: Partial<Topic>) => { setTopic((t) => ({ ...t, ...patch })); setDirty(true); setMsg(null); };
  const move = <T,>(list: T[], i: number, d: number) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; };
  const setQ = (i: number, patch: Partial<Question>) => edit({ questions: topic.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) });

  // Real Gemini Vision OCR Extraction Pipeline
  async function handleOcrImageUpload(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setOcrError("Please upload an image file (PNG, JPG, or WebP) or PDF.");
      return;
    }
    setOcrLoading(true);
    setOcrError(null);
    setMsg(null);

    // Save in sources for teacher record-keeping
    const nextSource = {
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      file,
    };
    setSources((current) => [nextSource, ...current]);

    try {
      const base64 = await fileToBase64(file);
      const res = await extractNotesFromImage(base64, file.type);
      if (res.ok) {
        const fullDoc = {
          ...res.data,
          subject: res.data.subject || subject.name,
          topic: res.data.topic || topic.title.toUpperCase(),
          title: res.data.title || topic.title,
        };
        setDocument(fullDoc);
        setDirty(true);
        setOcrLoading(false);
        // Seamlessly switch to Note tab for instant WYSIWYG review
        setTab("Note");
      } else {
        setOcrLoading(false);
        setOcrError(res.message || "Couldn't read the note. Please try a clearer photo.");
      }
    } catch (err: any) {
      setOcrLoading(false);
      setOcrError(err?.message || "Couldn't read the note. Please try a clearer photo.");
    }
  }

  function save(status: "published" | "draft") {
    // Sync current doc from Zustand into catalog topic
    const { notes: syncedNotes, objectives: syncedObjectives } = docBlocksToCatalogNotes(doc.blocks);
    const next: Topic = {
      ...topic,
      title: doc.title || topic.title,
      summary: doc.subtitle || topic.summary,
      objectives: syncedObjectives.length > 0 ? syncedObjectives : topic.objectives,
      notes: syncedNotes,
      status,
    };
    const err = validate(next);
    if (err) { setMsg({ ok: false, text: err }); return; }
    upsert(subject.id, next);
    setTopic(next);
    setDirty(false);
    setMsg({ ok: true, text: status === "published" ? "Published." : "Saved." });
  }

  return (
    <div className="max-w-4xl">
      <Link to="/admin/subjects" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">← Subjects & Content</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{subject.name}</p>
          <h1 className="font-display text-4xl">{doc.title || topic.title || "Untitled topic"}</h1>
        </div>
        <p className="text-sm text-muted">{topic.status === "draft" ? "Draft" : "Published"}{dirty ? " · unsaved changes" : ""}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {(["Details", "Source", "Note", "Questions", "Preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "min-h-11 rounded-full border px-5 text-sm font-semibold transition-all",
              tab === t ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface hover:bg-paper"
            )}
          >
            {t}{t === "Questions" ? ` (${topic.questions.length})` : t === "Note" ? ` (${doc.blocks.length})` : t === "Source" ? ` (${sources.length})` : ""}
          </button>
        ))}
      </div>

      {/* TAB 1: Source Tab with 2 Independent OCR Workflows */}
      {tab === "Source" && (
        <div className="mt-5 space-y-6">
          {/* Sub-navigation for two independent OCR workflows */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3">
            <button
              type="button"
              onClick={() => setSourceWorkflow("notes")}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2",
                sourceWorkflow === "notes"
                  ? "bg-[#1A4D2E] text-white shadow-xs"
                  : "bg-surface border border-line text-muted hover:text-ink hover:border-primary/40"
              )}
            >
              <span>📝 A. Lesson Note OCR</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceWorkflow("questions")}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2",
                sourceWorkflow === "questions"
                  ? "bg-[#1A4D2E] text-white shadow-xs"
                  : "bg-surface border border-line text-muted hover:text-ink hover:border-primary/40"
              )}
            >
              <span>❓ B. Topic Quiz Question & Answer OCR</span>
            </button>
          </div>

          {sourceWorkflow === "notes" ? (
            /* Workflow A: Lesson Note OCR */
            <div className="space-y-6">
              {/* Custom OCR File Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFiles = Array.from(e.dataTransfer.files);
                  const imageFile = droppedFiles.find((f) => f.type.startsWith("image/"));
                  if (imageFile) {
                    handleOcrImageUpload(imageFile);
                  } else if (droppedFiles.length > 0) {
                    setOcrError("Please drop an image file (PNG, JPG, or WebP).");
                  }
                }}
                onClick={() => !ocrLoading && fileInputRef.current?.click()}
                className={cn(
                  "relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer shadow-xs",
                  isDragging
                    ? "border-[#1A4D2E] bg-[#1A4D2E]/10 scale-[0.99]"
                    : "border-[#1A4D2E]/30 bg-[#FDFBF7] hover:border-[#1A4D2E] hover:bg-[#FDFBF7]/90 hover:shadow-sm",
                  ocrLoading && "cursor-default pointer-events-none"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleOcrImageUpload(file);
                    }
                    e.target.value = "";
                  }}
                />

                {ocrLoading ? (
                  <div className="py-6">
                    {/* Custom Slick Concentric Spinner */}
                    <div className="relative size-16 mx-auto mb-5">
                      <div className="absolute inset-0 rounded-full border-4 border-[#1A4D2E]/15" />
                      <div className="absolute inset-0 rounded-full border-4 border-[#1A4D2E] border-t-transparent animate-spin" />
                      <div className="absolute inset-2 rounded-full border-2 border-[#1A4D2E]/35 border-b-transparent animate-spin [animation-direction:reverse] [animation-duration:1.4s]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="size-2 rounded-full bg-[#1A4D2E] animate-pulse" />
                      </div>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl text-[#1A4D2E] font-medium tracking-tight">
                      Gemini is reading the handwriting...
                    </h3>
                    <p className="font-sans text-sm text-[#6B6B6B] mt-2 max-w-md mx-auto leading-relaxed">
                      Analyzing layout, identifying learning objectives and headings, and converting mathematical equations into KaTeX LaTeX...
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    {/* Upload Icon */}
                    <div className="mx-auto size-14 rounded-2xl bg-[#1A4D2E]/10 text-[#1A4D2E] flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                      <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" strokeLinecap="round" />
                        <path d="m16 16-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl text-[#2A2422] font-medium tracking-tight">
                      Upload Handwritten Note (Image)
                    </h3>
                    <p className="font-sans text-sm text-[#6B6B6B] mt-2 max-w-md mx-auto leading-relaxed">
                      Drag & drop your handwritten lesson photo here, or click to browse. Gemini will convert it directly into structured WYSIWYG blocks.
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1A4D2E] px-6 py-2.5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-[#153e25] transition-colors">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Choose Photo from Device
                    </div>

                    <p className="mt-3 text-[11px] font-sans text-[#8C827A]">
                      Supports JPG, PNG, and WebP · KaTeX formulas converted automatically
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Error Toast */}
              {ocrError && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 flex items-start justify-between gap-3 text-sm text-red-800 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <svg className="size-5 shrink-0 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <p className="font-semibold">{ocrError}</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Ensure good lighting, flat paper, and high contrast for optimal handwriting recognition.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOcrError(null)}
                    className="text-red-500 hover:text-red-800 text-xs font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Uploaded Reference Documents */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-lg text-[#2A2422]">Uploaded Source Records ({sources.length})</h4>
                  <button
                    type="button"
                    onClick={() => setTab("Note")}
                    className="text-xs font-semibold text-[#1A4D2E] hover:underline"
                  >
                    Go to Note Studio →
                  </button>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Source photographs remain stored with the lesson for administrative reference.
                </p>

                <ul className="mt-3 space-y-2">
                  {sources.map((file, i) => (
                    <li key={file.url} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-serif font-bold text-xs text-muted">{i + 1}.</span>
                        <span className="truncate max-w-xs sm:max-w-md font-sans text-xs sm:text-sm font-medium">{file.name}</span>
                      </div>
                      <span className="flex gap-2">
                        <button type="button" onClick={() => setPreview(file.url)} className="min-h-9 rounded-full border border-line px-3 text-xs font-medium hover:bg-paper">Preview</button>
                        <button type="button" onClick={() => handleOcrImageUpload(file.file)} className="min-h-9 rounded-full border border-[#1A4D2E]/30 bg-[#1A4D2E]/10 text-[#1A4D2E] px-3 text-xs font-semibold hover:bg-[#1A4D2E]/20">Re-Extract</button>
                        <button type="button" onClick={() => setSources((current) => current.filter((_, k) => k !== i))} className="min-h-9 rounded-full border border-line px-3 text-xs hover:bg-red-50 text-red-600">Remove</button>
                      </span>
                    </li>
                  ))}
                  {sources.length === 0 && (
                    <li className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted font-sans">
                      No source notes uploaded yet. Upload a photo above to start AI extraction.
                    </li>
                  )}
                </ul>

                {preview && (
                  <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Source Preview</p>
                      <button type="button" onClick={() => setPreview(null)} className="text-xs font-semibold text-primary">Close preview</button>
                    </div>
                    {sources.find((s) => s.url === preview)?.type === "application/pdf" ? (
                      <iframe title="Source PDF" src={preview} className="h-96 w-full rounded-xl" />
                    ) : (
                      <img src={preview} alt="Uploaded source" className="max-h-[500px] w-full rounded-xl object-contain bg-paper" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Workflow B: Topic Quiz & Theory Question OCR */
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#1A4D2E]/20 bg-[#FDFBF7] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-[#1A4D2E] font-medium">
                    Topic Quiz & Theory Question OCR
                  </h3>
                  <button
                    type="button"
                    onClick={() => setTab("Questions")}
                    className="text-xs font-semibold text-[#1A4D2E] hover:underline"
                  >
                    View Questions Tab ({topic.questions.length + (topic.theory || []).length}) →
                  </button>
                </div>
                <p className="font-sans text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                  Upload or snap objective question pages and theory question pages for <strong>{topic.title}</strong>. Gemini independently solves both formats with step-by-step model answers and explanations for teacher review before importing.
                </p>
              </div>

              <TopicQuizOcrWorkspace
                topicTitle={topic.title}
                onImportToTopic={handleImportTopicQuestions}
                onNavigateToQuestionsTab={() => setTab("Questions")}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Note Tab with the full WYSIWYG Editor */}
      {tab === "Note" && (
        <div className="mt-5 space-y-3">
          <div className="rounded-3xl border border-[#E5E0D8] bg-[#FDFBF7] shadow-sm overflow-hidden">
            {/* Subtle top document bar */}
            <div className="border-b border-[#E5E0D8] bg-[#F7F4EE] px-5 py-3 flex items-center justify-between text-xs font-sans text-[#6B6B6B]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#1A4D2E]" />
                <span className="font-medium text-[#2A2422]">
                  {doc.subject || subject.name} / {doc.title || topic.title}
                </span>
                <span className="text-[#8C827A]">
                  · {doc.blocks.length} block{doc.blocks.length === 1 ? "" : "s"}
                </span>
              </div>
              <span className="text-[11px] text-[#8C827A]">
                Hover block for drag handle · Click text to edit inline
              </span>
            </div>

            {/* WYSIWYG Editable Note Studio */}
            <NotePreviewRenderer readOnly={false} />
          </div>
        </div>
      )}

      {/* TAB 3: Preview Tab with Read-Only Student View */}
      {tab === "Preview" && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted">
              {topic.status === "draft"
                ? "Draft student preview — exactly what the student sees upon release."
                : "Student Lesson View — live published display."}
            </p>
            <button
              type="button"
              onClick={() => setTab("Note")}
              className="text-xs font-semibold text-[#1A4D2E] hover:underline"
            >
              Open in Note Editor →
            </button>
          </div>

          <div className="rounded-3xl border border-[#E5E0D8] bg-[#FDFBF7] shadow-sm overflow-hidden">
            {/* Read-Only Clean Student View */}
            <NotePreviewRenderer readOnly={true} />
          </div>
        </div>
      )}

      {/* TAB 4: Details Tab (Cleaned up: Diagram & Objectives removed, synced with Zustand) */}
      {tab === "Details" && (
        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
            <div>
              <label className="block font-sans text-xs font-semibold text-muted uppercase tracking-wider mb-1" htmlFor="topic-title">
                Topic Title
              </label>
              <input
                id="topic-title"
                value={doc.title}
                onChange={(e) => {
                  updateMeta("title", e.target.value);
                  edit({ title: e.target.value });
                }}
                className={field}
                placeholder="Topic Title (e.g., Quadratic Equations)"
              />
              <p className="mt-1 text-xs text-muted font-sans">
                Directly synchronized with the lesson title in Note Studio and student view.
              </p>
            </div>

            <div>
              <label className="block font-sans text-xs font-semibold text-muted uppercase tracking-wider mb-1" htmlFor="topic-summary">
                One-line summary (Subtitle)
              </label>
              <input
                id="topic-summary"
                value={doc.subtitle}
                onChange={(e) => {
                  updateMeta("subtitle", e.target.value);
                  edit({ summary: e.target.value });
                }}
                className={field}
                placeholder="Core concept summary..."
              />
              <p className="mt-1 text-xs text-muted font-sans">
                Displayed as the lesson subtitle right beneath the main title.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-sans text-xs font-semibold text-muted uppercase tracking-wider mb-1" htmlFor="topic-minutes">
                  Minutes to read (Estimated)
                </label>
                <input
                  id="topic-minutes"
                  type="number"
                  min={1}
                  value={topic.minutes}
                  onChange={(e) => {
                    const min = Math.max(1, Number(e.target.value) || 1);
                    edit({ minutes: min });
                    updateMeta("meta", `${min} min · ${topic.questions.length} questions · 2 theory`);
                  }}
                  className={field}
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-muted uppercase tracking-wider mb-1" htmlFor="topic-meta">
                  Note Meta Line
                </label>
                <input
                  id="topic-meta"
                  type="text"
                  value={doc.meta}
                  onChange={(e) => updateMeta("meta", e.target.value)}
                  className={field}
                  placeholder="20 min · 4 questions · 2 theory"
                />
              </div>
            </div>
          </div>

          {/* Callout informing about Objectives and Diagrams */}
          <div className="rounded-2xl border border-[#1A4D2E]/20 bg-[#1A4D2E]/5 p-5 flex items-start gap-3 shadow-xs">
            <span className="inline-flex size-6 shrink-0 rounded-full bg-[#1A4D2E] text-white items-center justify-center mt-0.5">
              <svg className="size-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="text-sm">
              <p className="font-serif font-bold text-[#2A2422]">
                Learning Objectives & Diagrams moved to Note Studio
              </p>
              <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed font-sans">
                Learning objectives are now editable as a styled checklist block directly inside the note, and diagrams can be placed anywhere in the lesson flow with captions and image URLs.
              </p>
              <button
                type="button"
                onClick={() => setTab("Note")}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#1A4D2E] hover:underline font-sans"
              >
                Go to Note Studio →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Questions Tab */}
      {tab === "Questions" && (
        <div className="mt-5 space-y-6">
          {/* Objective Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink">
                  Objective Questions ({topic.questions.length})
                </h3>
                <p className="text-xs text-muted">Multiple choice A–D questions</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  edit({
                    questions: [
                      ...topic.questions,
                      {
                        id: `${topic.id}-q${Date.now().toString(36)}`,
                        prompt: "",
                        options: KEYS.map((key) => ({ key, text: "" })),
                        answer: "A",
                        explain: "",
                        reviewStatus: "Teacher Reviewed",
                      },
                    ],
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold hover:bg-paper"
              >
                <Plus className="size-3.5" />
                Add Objective Question
              </button>
            </div>

            {topic.questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Question {i + 1}</p>
                    {/* Status Badge with click to toggle Teacher Reviewed */}
                    <button
                      type="button"
                      onClick={() =>
                        setQ(i, {
                          reviewStatus:
                            q.reviewStatus === "Teacher Reviewed" ? "AI Solved" : "Teacher Reviewed",
                          needsReview: false,
                        })
                      }
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors flex items-center gap-1",
                        q.reviewStatus === "Teacher Reviewed"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : q.reviewStatus === "Needs Review" || q.needsReview
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      )}
                      title="Click to toggle status"
                    >
                      {q.reviewStatus === "Teacher Reviewed"
                        ? "✓ Teacher Reviewed"
                        : q.reviewStatus === "Needs Review" || q.needsReview
                        ? "⚠️ Needs Review"
                        : "⚡ AI Solved"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => edit({ questions: move(topic.questions, i, -1) })}
                      className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-paper text-muted hover:text-ink"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => edit({ questions: move(topic.questions, i, 1) })}
                      className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-paper text-muted hover:text-ink"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete question"
                      onClick={() => setDeleteConfirm({ type: "objective", index: i, title: `Objective Question ${i + 1}` })}
                      className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {q.reviewReason && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <strong>Review Note:</strong> {q.reviewReason}
                  </p>
                )}

                <label className="block text-xs font-semibold text-muted uppercase">
                  Prompt
                  <textarea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => setQ(i, { prompt: e.target.value })}
                    className={cn(field, "mt-1 font-normal normal-case")}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {q.options.map((o, k) => (
                    <label key={o.key} className="block text-xs font-semibold text-muted">
                      Option {o.key}
                      <input
                        value={o.text}
                        onChange={(e) =>
                          setQ(i, {
                            options: q.options.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)),
                          })
                        }
                        className={cn(field, "mt-1 font-normal")}
                      />
                    </label>
                  ))}
                </div>
                <fieldset className="flex flex-wrap items-center gap-2 text-sm">
                  <legend className="mb-1 text-xs font-semibold text-muted uppercase">Correct answer</legend>
                  {KEYS.map((k) => (
                    <label
                      key={k}
                      className={cn(
                        "flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full border px-3 text-xs font-bold cursor-pointer transition-colors",
                        q.answer === k ? "border-[#1A4D2E] bg-[#1A4D2E] text-white" : "border-line bg-surface text-muted"
                      )}
                    >
                      <input
                        type="radio"
                        name={`ans-${q.id}`}
                        checked={q.answer === k}
                        onChange={() => setQ(i, { answer: k })}
                        className="sr-only"
                      />
                      {k}
                    </label>
                  ))}
                </fieldset>
                <label className="block text-xs font-semibold text-muted uppercase">
                  Explanation / Step-by-Step Working
                  <textarea
                    rows={2}
                    value={q.explain}
                    onChange={(e) => setQ(i, { explain: e.target.value })}
                    className={cn(field, "mt-1 font-normal normal-case")}
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Theory Questions Section */}
          <div className="space-y-4 pt-4 border-t border-line">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink">
                  Theory Questions & Model Answers ({(topic.theory || []).length})
                </h3>
                <p className="text-xs text-muted">Worked solutions, subparts, and model answers</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  edit({
                    theory: [
                      ...(topic.theory || []),
                      {
                        id: `${topic.id}-t${Date.now().toString(36)}`,
                        prompt: "",
                        modelAnswer: "",
                        marks: 5,
                        subparts: [],
                        reviewStatus: "Teacher Reviewed",
                      },
                    ],
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold hover:bg-paper"
              >
                <Plus className="size-3.5" />
                Add Theory Question
              </button>
            </div>

            {(topic.theory || []).map((t, i) => (
              <div key={t.id} className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Theory Question {i + 1}</p>
                    {/* Status Badge with toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextTheory = [...(topic.theory || [])];
                        nextTheory[i] = {
                          ...t,
                          reviewStatus:
                            t.reviewStatus === "Teacher Reviewed" ? "AI Solved" : "Teacher Reviewed",
                          needsReview: false,
                        };
                        edit({ theory: nextTheory });
                      }}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors flex items-center gap-1",
                        t.reviewStatus === "Teacher Reviewed"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : t.reviewStatus === "Needs Review" || t.needsReview
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-teal-100 text-teal-800 border-teal-300"
                      )}
                      title="Click to toggle status"
                    >
                      {t.reviewStatus === "Teacher Reviewed"
                        ? "✓ Teacher Reviewed"
                        : t.reviewStatus === "Needs Review" || t.needsReview
                        ? "⚠️ Needs Review"
                        : "⚡ AI Solved"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-medium">Marks:</span>
                    <input
                      type="number"
                      min={1}
                      value={t.marks || 5}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 1;
                        const nextTheory = [...(topic.theory || [])];
                        nextTheory[i] = { ...t, marks: val };
                        edit({ theory: nextTheory });
                      }}
                      className="w-14 rounded-lg border border-line bg-paper px-2 py-1 text-xs font-bold text-ink"
                    />
                    <button
                      type="button"
                      aria-label="Delete theory question"
                      onClick={() => setDeleteConfirm({ type: "theory", index: i, title: `Theory Question ${i + 1}` })}
                      className="inline-flex size-9 items-center justify-center text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {t.reviewReason && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <strong>Review Note:</strong> {t.reviewReason}
                  </p>
                )}

                {/* Recreated Vector SVG Diagram */}
                {t.diagramSvg && (
                  <div className="space-y-1.5 my-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider">
                      <span>Recreated Vector Diagram</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                        ✓ SVG Clean Vector
                      </span>
                    </div>
                    <div
                      className="diagram-container bg-white p-4 rounded-xl border border-gray-200 flex justify-center items-center my-1 overflow-x-auto min-h-[140px] shadow-2xs"
                      dangerouslySetInnerHTML={{ __html: t.diagramSvg }}
                    />
                    {t.diagramCaption && (
                      <p className="text-center text-xs text-muted italic">Figure: {t.diagramCaption}</p>
                    )}
                  </div>
                )}

                <label className="block text-xs font-semibold text-muted uppercase">
                  Question Prompt / Stem
                  <textarea
                    rows={2}
                    value={t.prompt}
                    onChange={(e) => {
                      const nextTheory = [...(topic.theory || [])];
                      nextTheory[i] = { ...t, prompt: e.target.value };
                      edit({ theory: nextTheory });
                    }}
                    className={cn(field, "mt-1 font-normal normal-case")}
                  />
                </label>

                {/* If hierarchical parts exist */}
                {t.parts && t.parts.length > 0 ? (
                  <div className="space-y-3 pt-2 border-t border-line/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                        Hierarchical Parts ({t.parts.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextTheory = [...(topic.theory || [])];
                          const curParts = t.parts || [];
                          const nextLabel = `${i + 1}${String.fromCharCode(97 + curParts.length)}.`;
                          nextTheory[i] = {
                            ...t,
                            parts: [
                              ...curParts,
                              { label: nextLabel, questionText: "", directAnswer: "", tutorExplanation: "", marks: "[2 marks]" },
                            ],
                          };
                          edit({ theory: nextTheory });
                        }}
                        className="text-xs font-semibold text-[#1A4D2E] hover:underline"
                      >
                        + Add Hierarchical Part
                      </button>
                    </div>

                    <div className="space-y-3">
                      {t.parts.map((p, pIdx) => {
                        const depth = getTheoryPartDepth(p.label);
                        const indentClass = getTheoryIndentClass(depth);
                        return (
                          <div
                            key={pIdx}
                            className={cn(
                              "rounded-xl border border-line bg-surface p-3 space-y-2 shadow-2xs transition-all",
                              indentClass
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={p.label}
                                  onChange={(e) => {
                                    const nextTheory = [...(topic.theory || [])];
                                    const nextParts = [...(t.parts || [])];
                                    nextParts[pIdx] = { ...p, label: e.target.value };
                                    nextTheory[i] = { ...t, parts: nextParts };
                                    edit({ theory: nextTheory });
                                  }}
                                  className="w-16 rounded-lg border border-line px-2 py-1 font-bold text-ink text-xs"
                                  placeholder="4a(i)"
                                />
                                <span className="text-[10px] text-muted">
                                  {depth === 0 ? "Main Question" : depth === 1 ? "Sub-Question" : "Sub-sub-part"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={p.marks || ""}
                                  onChange={(e) => {
                                    const nextTheory = [...(topic.theory || [])];
                                    const nextParts = [...(t.parts || [])];
                                    nextParts[pIdx] = { ...p, marks: e.target.value };
                                    nextTheory[i] = { ...t, parts: nextParts };
                                    edit({ theory: nextTheory });
                                  }}
                                  placeholder="[2 marks]"
                                  className="w-20 rounded-lg border border-line px-2 py-0.5 text-xs text-muted font-medium text-right"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextTheory = [...(topic.theory || [])];
                                    const nextParts = (t.parts || []).filter((_, k) => k !== pIdx);
                                    nextTheory[i] = { ...t, parts: nextParts };
                                    edit({ theory: nextTheory });
                                  }}
                                  className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={p.questionText}
                              onChange={(e) => {
                                const nextTheory = [...(topic.theory || [])];
                                const nextParts = [...(t.parts || [])];
                                nextParts[pIdx] = { ...p, questionText: e.target.value };
                                nextTheory[i] = { ...t, parts: nextParts };
                                edit({ theory: nextTheory });
                              }}
                              placeholder="Part question prompt..."
                              className="w-full rounded-lg border border-line bg-paper/60 px-2.5 py-1.5 text-xs text-ink"
                            />

                            {/* Direct Answer with subtle green border-left */}
                            <div className="border-l-4 border-emerald-500 bg-emerald-50/70 p-2.5 rounded-r-lg space-y-1">
                              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                                Direct Answer / Model Solution:
                              </span>
                              <textarea
                                rows={2}
                                value={p.directAnswer}
                                onChange={(e) => {
                                  const nextTheory = [...(topic.theory || [])];
                                  const nextParts = [...(t.parts || [])];
                                  nextParts[pIdx] = { ...p, directAnswer: e.target.value };
                                  nextTheory[i] = { ...t, parts: nextParts };
                                  edit({ theory: nextTheory });
                                }}
                                placeholder="Direct calculation steps and answer..."
                                className="w-full rounded border border-emerald-200 bg-white px-2 py-1 font-mono text-[11px] text-ink"
                              />
                            </div>

                            {/* Tutor explanation with lightbulb */}
                            <div className="rounded-lg bg-[#F7F5F0] border border-[#E5E0D8] p-2 flex items-start gap-2 text-xs">
                              <Lightbulb className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <span className="text-[10px] font-bold text-ink uppercase tracking-wide block">
                                  Tutor Explanation:
                                </span>
                                <textarea
                                  rows={2}
                                  value={p.tutorExplanation}
                                  onChange={(e) => {
                                    const nextTheory = [...(topic.theory || [])];
                                    const nextParts = [...(t.parts || [])];
                                    nextParts[pIdx] = { ...p, tutorExplanation: e.target.value };
                                    nextTheory[i] = { ...t, parts: nextParts };
                                    edit({ theory: nextTheory });
                                  }}
                                  placeholder="Step-by-step guidance..."
                                  className="w-full rounded border border-line bg-white px-2 py-1 font-sans text-[11px] text-ink"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <label className="block text-xs font-semibold text-muted uppercase">
                    Model Answer / Working
                    <textarea
                      rows={4}
                      value={t.modelAnswer}
                      onChange={(e) => {
                        const nextTheory = [...(topic.theory || [])];
                        nextTheory[i] = { ...t, modelAnswer: e.target.value };
                        edit({ theory: nextTheory });
                      }}
                      className={cn(field, "mt-1 font-mono text-xs font-normal normal-case leading-relaxed")}
                    />
                  </label>
                )}

                {/* Subparts management */}
                <div className="space-y-2 pt-2 border-t border-line/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Subparts ({(t.subparts || []).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextTheory = [...(topic.theory || [])];
                        const curSubparts = t.subparts || [];
                        const nextLabel = `(${String.fromCharCode(97 + curSubparts.length)})`;
                        nextTheory[i] = {
                          ...t,
                          subparts: [
                            ...curSubparts,
                            { label: nextLabel, prompt: "", modelAnswer: "", marks: 2 },
                          ],
                        };
                        edit({ theory: nextTheory });
                      }}
                      className="text-xs font-semibold text-[#1A4D2E] hover:underline"
                    >
                      + Add Subpart
                    </button>
                  </div>

                  {(t.subparts || []).map((sp, spIdx) => (
                    <div key={spIdx} className="rounded-xl border border-line bg-paper/50 p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={sp.label}
                            onChange={(e) => {
                              const nextTheory = [...(topic.theory || [])];
                              const nextSubparts = [...(t.subparts || [])];
                              nextSubparts[spIdx] = { ...sp, label: e.target.value };
                              nextTheory[i] = { ...t, subparts: nextSubparts };
                              edit({ theory: nextTheory });
                            }}
                            className="w-14 rounded-lg border border-line px-2 py-1 font-bold text-ink"
                            placeholder="(a)"
                          />
                          <span className="text-[10px] text-muted">Subpart</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-muted">Marks:</label>
                          <input
                            type="number"
                            min={1}
                            value={sp.marks || 2}
                            onChange={(e) => {
                              const nextTheory = [...(topic.theory || [])];
                              const nextSubparts = [...(t.subparts || [])];
                              nextSubparts[spIdx] = { ...sp, marks: Number(e.target.value) || 1 };
                              nextTheory[i] = { ...t, subparts: nextSubparts };
                              edit({ theory: nextTheory });
                            }}
                            className="w-12 rounded-lg border border-line px-1.5 py-0.5 text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextTheory = [...(topic.theory || [])];
                              const nextSubparts = (t.subparts || []).filter((_, k) => k !== spIdx);
                              nextTheory[i] = { ...t, subparts: nextSubparts };
                              edit({ theory: nextTheory });
                            }}
                            className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={sp.prompt}
                        onChange={(e) => {
                          const nextTheory = [...(topic.theory || [])];
                          const nextSubparts = [...(t.subparts || [])];
                          nextSubparts[spIdx] = { ...sp, prompt: e.target.value };
                          nextTheory[i] = { ...t, subparts: nextSubparts };
                          edit({ theory: nextTheory });
                        }}
                        placeholder="Subpart question statement..."
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                      />

                      <textarea
                        rows={2}
                        value={sp.modelAnswer}
                        onChange={(e) => {
                          const nextTheory = [...(topic.theory || [])];
                          const nextSubparts = [...(t.subparts || [])];
                          nextSubparts[spIdx] = { ...sp, modelAnswer: e.target.value };
                          nextTheory[i] = { ...t, subparts: nextSubparts };
                          edit({ theory: nextTheory });
                        }}
                        placeholder="Subpart model answer / calculation working..."
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink">Delete Question</h3>
                    <p className="text-xs text-muted">Are you sure you want to delete {deleteConfirm.title}?</p>
                  </div>
                </div>
                <p className="text-sm text-muted">
                  This action cannot be undone once changes are saved.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 rounded-full border border-line text-xs font-semibold hover:bg-paper"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteConfirm.type === "objective") {
                        edit({ questions: topic.questions.filter((_, k) => k !== deleteConfirm.index) });
                      } else {
                        edit({ theory: (topic.theory || []).filter((_, k) => k !== deleteConfirm.index) });
                      }
                      setDeleteConfirm(null);
                    }}
                    className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-xs"
                  >
                    Delete Question
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <button type="button" onClick={() => save("published")} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg">Publish</button>
        <button type="button" onClick={() => save("draft")} className="min-h-12 rounded-full border border-line bg-surface px-6 font-semibold">Save as draft</button>
        <p role="status" aria-live="polite" className={cn("text-sm", msg && !msg.ok && "font-semibold")}>{msg?.text}</p>
      </div>
    </div>
  );
}
