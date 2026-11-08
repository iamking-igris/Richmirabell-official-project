import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect } from "react";
import {
  FileUp,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  ArrowRight,
  Eye,
  Lightbulb,
  X,
  UploadCloud,
  FileText,
  RotateCcw,
} from "lucide-react";
import {
  useWaecPaperStore,
  type WaecPaper,
  type WaecPaperStatus,
  type WaecSourceFile,
  type AnswerKeyConflict,
} from "@/lib/waec-paper-store";
import type { Question, TheoryQuestion, Choice } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { TheoryQuestionView } from "@/components/TheoryQuestionView";
import { extractQuestionsFromPage, extractTheoryFromPage, extractAnswersFromPage } from "@/lib/question-ocr-service";
import { getTheoryPartDepth, getTheoryIndentClass, sanitizeSvg } from "@/lib/theory-hierarchy";

export const Route = createFileRoute("/admin/past-questions")({ component: PastQuestionsPage });

const DEFAULT_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English Language",
  "Economics",
  "Government",
  "Literature in English",
  "Commerce",
  "Financial Accounting",
  "Agricultural Science",
  "Geography",
];

const KEYS: Choice[] = ["A", "B", "C", "D"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function PastQuestionsPage() {
  const { papers, addPaper, updatePaper, deletePaper, publishPaper, unpublishPaper, checkDuplicate } = useWaecPaperStore();

  // Mode: "library" or "workspace"
  const [viewMode, setViewMode] = useState<"library" | "workspace">("library");
  const [activePaperId, setActivePaperId] = useState<string | null>(null);

  // Filters for Library
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Deletion modal state
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);

  // Available unique subjects & years from existing papers
  const existingSubjects = useMemo(() => {
    const set = new Set<string>(DEFAULT_SUBJECTS);
    papers.forEach((p) => set.add(p.subject));
    return Array.from(set).sort();
  }, [papers]);

  const existingYears = useMemo(() => {
    const set = new Set<string>();
    papers.forEach((p) => set.add(String(p.year)));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [papers]);

  // Filtered papers list
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      if (subjectFilter !== "all" && paper.subject.toLowerCase() !== subjectFilter.toLowerCase()) {
        return false;
      }
      if (yearFilter !== "all" && String(paper.year) !== yearFilter) {
        return false;
      }
      if (statusFilter !== "all" && paper.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = paper.title.toLowerCase().includes(q);
        const matchSubject = paper.subject.toLowerCase().includes(q);
        const matchYear = String(paper.year).includes(q);
        if (!matchTitle && !matchSubject && !matchYear) return false;
      }
      return true;
    });
  }, [papers, subjectFilter, yearFilter, statusFilter, searchQuery]);

  function handleStartNewPaper() {
    setActivePaperId(null);
    setViewMode("workspace");
  }

  function handleEditPaper(paperId: string) {
    setActivePaperId(paperId);
    setViewMode("workspace");
  }

  function handleDeletePaper(id: string) {
    deletePaper(id);
    setDeleteModal(null);
  }

  return (
    <div className="space-y-6">
      {viewMode === "library" ? (
        /* ========================================================= */
        /* LIBRARY VIEW (Searchable, compact, clean)                */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                WAEC Examination Management
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl text-ink tracking-tight mt-0.5">
                WAEC Past Questions
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted font-sans max-w-2xl">
                Import, review and publish authentic WAEC examination papers.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartNewPaper}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#153e25] transition-colors self-start sm:self-center"
            >
              <Plus className="size-4" />
              <span>+ Import Paper</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-surface p-3.5 rounded-2xl border border-line">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted" />
              <input
                type="text"
                placeholder="Search subject or year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-primary"
              />
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-primary"
              >
                <option value="all">All Subjects</option>
                {existingSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-primary"
              >
                <option value="all">All Years</option>
                {existingYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="reviewing">In Review</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Papers Table / Cards */}
          {filteredPapers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
              <BookOpen className="size-10 text-muted mx-auto mb-3 opacity-60" />
              <h3 className="font-serif text-lg text-ink font-medium">No WAEC papers match your filters</h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                Try adjusting your search criteria or import a new WAEC examination paper.
              </p>
              <button
                type="button"
                onClick={handleStartNewPaper}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="size-3.5" />
                <span>Import First Paper</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-line rounded-3xl border border-line bg-surface overflow-hidden shadow-2xs">
              {filteredPapers.map((paper) => {
                const hasObj = paper.objectives && paper.objectives.length > 0;
                const hasTheory = paper.theory && paper.theory.length > 0;
                const objCount = paper.objectives?.length || 0;
                const theoryCount = paper.theory?.length || 0;

                return (
                  <div
                    key={paper.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-paper/40 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                            paper.status === "published"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : paper.status === "reviewing"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          )}
                        >
                          {paper.status === "published"
                            ? "✓ Published"
                            : paper.status === "reviewing"
                            ? "⚠️ In Review"
                            : "Draft"}
                        </span>

                        <span className="font-serif font-bold text-base text-ink">
                          {paper.subject} — {paper.year}
                        </span>

                        <span className="text-xs text-muted font-sans">
                          ({paper.title})
                        </span>
                      </div>

                      {/* Sections & Question counts */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="font-medium text-ink">
                          Sections:
                        </span>
                        {hasObj && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-paper border border-line font-medium text-ink text-[11px]">
                            <span>Objective:</span>
                            <strong className="text-primary">{objCount} Qs</strong>
                          </span>
                        )}
                        {hasTheory && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-paper border border-line font-medium text-ink text-[11px]">
                            <span>Theory:</span>
                            <strong className="text-[#1A4D2E]">{theoryCount} Qs</strong>
                          </span>
                        )}
                        {!hasObj && !hasTheory && (
                          <span className="text-amber-700 text-xs italic">
                            No questions extracted yet
                          </span>
                        )}
                        <span className="text-[11px] text-muted">· Updated {paper.updatedAt}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleEditPaper(paper.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:border-primary hover:text-primary transition-colors"
                      >
                        <Edit3 className="size-3.5" />
                        <span>Edit / Review</span>
                      </button>

                      {paper.status === "published" ? (
                        <button
                          type="button"
                          onClick={() => unpublishPaper(paper.id)}
                          className="px-3 py-1.5 rounded-xl border border-line bg-surface text-xs font-medium text-muted hover:text-ink transition-colors"
                          title="Unpublish to hide from students"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => publishPaper(paper.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs"
                        >
                          Publish
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteModal({ id: paper.id, title: `${paper.subject} (${paper.year})` })}
                        className="p-1.5 text-muted hover:text-red-600 rounded-lg transition-colors"
                        title="Delete paper"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delete confirmation modal */}
          {deleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <Trash2 className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-ink">Delete WAEC Paper?</h3>
                    <p className="text-xs text-muted">
                      Are you sure you want to delete <strong>{deleteModal.title}</strong>? This will permanently remove its questions.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModal(null)}
                    className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePaper(deleteModal.id)}
                    className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                  >
                    Delete Paper
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* IMPORT WORKFLOW: Details → Sources → Questions → Preview  */
        /* ========================================================= */
        <WaecPaperImportWorkspace
          paperId={activePaperId}
          onClose={() => setViewMode("library")}
        />
      )}
    </div>
  );
}

// =========================================================================
// 4-STEP IMPORT WORKSPACE: Details → Sources → Questions → Preview
// =========================================================================

interface WorkspaceProps {
  paperId: string | null;
  onClose: () => void;
}

function WaecPaperImportWorkspace({ paperId, onClose }: WorkspaceProps) {
  const { papers, addPaper, updatePaper, publishPaper, checkDuplicate } = useWaecPaperStore();

  const existingPaper = useMemo(() => {
    return paperId ? papers.find((p) => p.id === paperId) : null;
  }, [paperId, papers]);

  // Current Step: 1 (Details), 2 (Sources), 3 (Questions), 4 (Preview)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(existingPaper ? 3 : 1);

  // Details State
  const [subject, setSubject] = useState(existingPaper?.subject || "Physics");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [year, setYear] = useState(existingPaper ? String(existingPaper.year) : "2024");
  const [paperTitle, setPaperTitle] = useState(existingPaper?.title || "WAEC Physics 2024 (Theory & Objectives)");
  const [duplicateWarning, setDuplicateWarning] = useState<WaecPaper | null>(null);

  // Sources State (separate for Objective, Theory, and Answer Key)
  const [objFiles, setObjFiles] = useState<File[]>([]);
  const [theoryFiles, setTheoryFiles] = useState<File[]>([]);
  const [answerKeyFiles, setAnswerKeyFiles] = useState<File[]>([]);

  // Processing state with Note Studio concentric spinner animation
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState("");
  const [processError, setProcessError] = useState<string | null>(null);

  // Extracted Questions in current session
  const [objectives, setObjectives] = useState<Question[]>(existingPaper?.objectives || []);
  const [theory, setTheory] = useState<TheoryQuestion[]>(existingPaper?.theory || []);
  const [conflicts, setConflicts] = useState<AnswerKeyConflict[]>(existingPaper?.answerKeyConflicts || []);

  // Questions Review Tab
  const [activeSectionTab, setActiveSectionTab] = useState<"objective" | "theory">("objective");

  // Deletion in review
  const [deleteQModal, setDeleteQModal] = useState<{ type: "obj" | "theory"; index: number } | null>(null);

  // Save banner
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Auto-generate title when subject or year changes (if not custom)
  function handleSubjectChange(newSub: string) {
    if (newSub === "__custom__") {
      setIsCustomSubject(true);
      return;
    }
    setIsCustomSubject(false);
    setSubject(newSub);
    setPaperTitle(`WAEC ${newSub} ${year} (Theory & Objectives)`);
    checkForDup(newSub, year);
  }

  function handleYearChange(newYear: string) {
    setYear(newYear);
    const sub = isCustomSubject ? customSubject : subject;
    setPaperTitle(`WAEC ${sub} ${newYear} (Theory & Objectives)`);
    checkForDup(sub, newYear);
  }

  function checkForDup(sub: string, yr: string) {
    if (!sub || !yr) {
      setDuplicateWarning(null);
      return;
    }
    const dup = checkDuplicate(sub, yr, existingPaper?.id);
    setDuplicateWarning(dup || null);
  }

  // Check duplicate reactively on mount and whenever subject/year updates
  useEffect(() => {
    const effectiveSub = isCustomSubject ? customSubject : subject;
    checkForDup(effectiveSub, year);
  }, [subject, isCustomSubject, customSubject, year, papers]);

  // Handle OCR Extraction using Note Studio real processing
  async function handleRunOcrExtraction() {
    if (objFiles.length === 0 && theoryFiles.length === 0) {
      setProcessError("Please upload at least one Objective or Theory question page photo or PDF.");
      return;
    }

    setIsProcessing(true);
    setProcessError(null);
    setProcessMsg("Gemini is reading examination source pages and solving answers...");

    const batchId = `waec-${Date.now()}`;
    const newObjectives: Question[] = [...objectives];
    const newTheory: TheoryQuestion[] = [...theory];
    const newConflicts: AnswerKeyConflict[] = [];

    try {
      // 1. Process Objective Source Pages
      if (objFiles.length > 0) {
        for (let i = 0; i < objFiles.length; i++) {
          const file = objFiles[i];
          setProcessMsg(`Extracting and solving objective questions from ${file.name} (page ${i + 1} of ${objFiles.length})...`);
          const base64 = await fileToBase64(file);
          const res = await extractQuestionsFromPage(
            base64,
            file.type || "image/jpeg",
            file.name,
            batchId,
            `waec-obj-src-${i}`,
            i + 1
          );

          if (res.ok) {
            for (const q of res.questions) {
              const optionsList = KEYS.map((k) => {
                const foundOpt = q.options?.find((o: any) => o.key === k);
                return { key: k, text: foundOpt ? foundOpt.text : "" };
              });

              const aiSolved = q.solvedAnswer?.toUpperCase();
              const isValidKey = aiSolved && KEYS.includes(aiSolved as Choice);
              const finalAns: Choice = isValidKey ? (aiSolved as Choice) : "A";
              const needsRev = Boolean(q.needsReview || q.hasWarning || !isValidKey);

              newObjectives.push({
                id: `waec-q-${newObjectives.length}-${Date.now()}`,
                prompt: q.prompt || "",
                options: optionsList,
                answer: finalAns,
                explain: q.explanation || "",
                needsReview: needsRev,
                reviewReason: q.reviewReason || q.warningDetails,
                reviewStatus: needsRev ? "Needs Review" : "AI Solved",
                sourceOrigin: "ai_solved",
                answerKeyStatus: "shipped",
              });
            }
          } else {
            setProcessError(res.message);
          }
        }
      }

      // 2. Process Theory Source Pages
      if (theoryFiles.length > 0) {
        for (let i = 0; i < theoryFiles.length; i++) {
          const file = theoryFiles[i];
          setProcessMsg(`Extracting theory questions, recreating diagrams, and solving model answers from ${file.name} (page ${i + 1} of ${theoryFiles.length})...`);
          const base64 = await fileToBase64(file);
          const res = await extractTheoryFromPage(
            base64,
            file.type || "image/jpeg",
            file.name,
            batchId,
            `waec-th-src-${i}`,
            i + 1
          );

          if (res.ok) {
            for (const t of res.theoryQuestions) {
              const hasModelAns = Boolean(
                (t.modelAnswer && t.modelAnswer.trim().length > 0) ||
                (t.parts && t.parts.some((p: any) => p.directAnswer))
              );
              const needsRev = Boolean(t.needsReview || t.hasWarning || !hasModelAns);
              const diagramSvg = sanitizeSvg(t.diagramSvg);

              let parts: any[] = [];
              if (Array.isArray(t.parts) && t.parts.length > 0) {
                parts = t.parts.map((p: any) => ({
                  label: String(p.label || "").trim(),
                  questionText: String(p.questionText || p.prompt || "").trim(),
                  directAnswer: String(p.directAnswer || p.modelAnswer || "").trim(),
                  tutorExplanation: String(p.tutorExplanation || p.explanation || p.explain || "").trim(),
                  marks: p.marks ? String(p.marks).trim() : undefined,
                }));
              } else if (t.prompt) {
                parts.push({
                  label: t.questionNumber ? `${t.questionNumber}.` : "1.",
                  questionText: t.prompt.trim(),
                  directAnswer: t.modelAnswer ? t.modelAnswer.trim() : "",
                  tutorExplanation: t.explain ? t.explain.trim() : "",
                  marks: t.marks ? `[${t.marks} marks]` : undefined,
                });
              }

              newTheory.push({
                id: `waec-th-${newTheory.length}-${Date.now()}`,
                prompt: t.prompt || (parts[0]?.questionText ?? ""),
                modelAnswer: t.modelAnswer || (parts[0]?.directAnswer ?? ""),
                marks: typeof t.marks === "number" ? t.marks : 5,
                explain: t.explain || (parts[0]?.tutorExplanation ?? ""),
                parts,
                subparts: Array.isArray(t.subparts) ? t.subparts : [],
                diagramSvg,
                diagramCaption: t.diagramCaption,
                needsReview: needsRev,
                reviewReason: t.reviewReason || t.warningDetails,
                reviewStatus: needsRev ? "Needs Review" : (t.reviewStatus || "AI Solved"),
                sourceOrigin: "ai_solved",
              });
            }
          } else {
            setProcessError(res.message);
          }
        }
      }

      // 3. Process Answer Key Pages if supplied (Optional reconciliation)
      if (answerKeyFiles.length > 0) {
        for (let i = 0; i < answerKeyFiles.length; i++) {
          const file = answerKeyFiles[i];
          setProcessMsg(`Extracting answer keys and checking for conflicts from ${file.name}...`);
          const base64 = await fileToBase64(file);
          const res = await extractAnswersFromPage(
            base64,
            file.type || "image/jpeg",
            file.name,
            batchId,
            `waec-ans-src-${i}`,
            i + 1
          );

          if (res.ok) {
            for (const ans of res.answers) {
              const matchedObj = newObjectives.find((o, idx) => String(idx + 1) === ans.questionNumber);
              if (matchedObj && ans.selectedOption) {
                const keyOpt = ans.selectedOption.toUpperCase();
                if (matchedObj.answer !== keyOpt) {
                  newConflicts.push({
                    questionNumber: ans.questionNumber,
                    solvedAnswer: matchedObj.answer || "None",
                    keyAnswer: keyOpt,
                    note: `Disagreement detected: Solved answer is ${matchedObj.answer}, official key states ${keyOpt}.`,
                  });
                  matchedObj.needsReview = true;
                  matchedObj.reviewReason = `Answer Key Conflict: Solved was ${matchedObj.answer}, key states ${keyOpt}.`;
                  matchedObj.reviewStatus = "Needs Review";
                }
              }
            }
          }
        }
      }

      setObjectives(newObjectives);
      setTheory(newTheory);
      setConflicts(newConflicts);
      setIsProcessing(false);
      setCurrentStep(3); // Advance to Questions review step
    } catch (err: any) {
      console.error("WAEC OCR error:", err);
      setIsProcessing(false);
      setProcessError(err?.message || "Failed to process WAEC examination source pages.");
    }
  }

  // Save / Publish handlers
  function handleSave(status: WaecPaperStatus) {
    const finalSubject = isCustomSubject ? customSubject.trim() : subject.trim();
    if (!finalSubject) {
      alert("Please provide a valid subject.");
      return;
    }
    const finalYear = year.trim();
    if (!finalYear) {
      alert("Please provide a valid examination year.");
      return;
    }

    const id = existingPaper?.id || `waec-${finalSubject.toLowerCase().replace(/\s+/g, "-")}-${finalYear}`;

    const paperData: WaecPaper = {
      id,
      subject: finalSubject,
      subjectId: finalSubject.toLowerCase().replace(/\s+/g, "-"),
      year: finalYear,
      title: paperTitle.trim() || `WAEC ${finalSubject} ${finalYear}`,
      label: "Official WAEC WASSCE Examination Paper",
      status,
      createdAt: existingPaper?.createdAt || new Date().toISOString().slice(0, 16).replace("T", " "),
      updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      objectives,
      theory,
      timerSeconds: 50 * 60,
      answerKeyConflicts: conflicts,
    };

    if (existingPaper) {
      updatePaper(existingPaper.id, paperData);
    } else {
      const res = addPaper(paperData);
      if (!res.ok) {
        alert(res.error);
        return;
      }
    }

    setSaveSuccessMsg(
      status === "published"
        ? "Paper published! It is now live in the student Past Questions library."
        : status === "reviewing"
        ? "Paper marked In Review."
        : "Draft saved successfully."
    );

    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Step Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Back to Library
          </button>
          <span className="text-muted text-xs">/</span>
          <span className="font-serif font-bold text-sm text-ink">
            {existingPaper ? `Edit ${existingPaper.title}` : "Import WAEC Paper"}
          </span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Sources" },
            { num: 3, label: "Questions" },
            { num: 4, label: "Preview" },
          ].map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setCurrentStep(st.num as any)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1",
                currentStep === st.num
                  ? "bg-[#1A4D2E] text-white shadow-2xs"
                  : currentStep > st.num
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-surface border border-line text-muted"
              )}
            >
              <span>{st.num}.</span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccessMsg && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Processing State with Concentric Animation matching Note Studio */}
      {isProcessing && (
        <div className="rounded-3xl border-2 border-dashed border-[#1A4D2E]/30 bg-[#FDFBF7] p-12 text-center shadow-xs">
          <div className="relative size-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-[#1A4D2E]/15" />
            <div className="absolute inset-0 rounded-full border-4 border-[#1A4D2E] border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-[#1A4D2E]/35 border-b-transparent animate-spin [animation-direction:reverse] [animation-duration:1.4s]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="size-2 rounded-full bg-[#1A4D2E] animate-pulse" />
            </div>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl text-[#1A4D2E] font-medium tracking-tight">
            Gemini is reading examination pages & solving answers...
          </h3>
          <p className="font-sans text-sm text-[#6B6B6B] mt-2 max-w-md mx-auto leading-relaxed">
            {processMsg}
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: DETAILS                                           */}
      {/* ========================================================= */}
      {!isProcessing && currentStep === 1 && (
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-5 max-w-2xl mx-auto shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step 1 of 4</span>
            <h2 className="font-serif text-2xl text-ink font-bold mt-1">Paper Details</h2>
            <p className="text-xs text-muted font-sans mt-0.5">
              Specify the subject and examination year for this WAEC paper.
            </p>
          </div>

          {duplicateWarning && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="size-4" />
                <span>Existing Paper Detected</span>
              </div>
              <p>
                A WAEC paper for <strong>{duplicateWarning.subject} ({duplicateWarning.year})</strong> already exists ({duplicateWarning.title}).
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubject(duplicateWarning.subject);
                  setYear(String(duplicateWarning.year));
                  setObjectives(duplicateWarning.objectives);
                  setTheory(duplicateWarning.theory);
                  setDuplicateWarning(null);
                  setCurrentStep(3);
                }}
                className="text-xs font-bold text-amber-900 underline hover:text-amber-950"
              >
                Open and update existing record →
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Subject Selection */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Subject
              </label>
              {!isCustomSubject ? (
                <div className="space-y-2">
                  <select
                    value={subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary"
                  >
                    {DEFAULT_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="__custom__">+ Add Custom Subject...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter subject name (e.g. Further Mathematics)"
                    value={customSubject}
                    onChange={(e) => {
                      setCustomSubject(e.target.value);
                      handleSubjectChange(e.target.value);
                    }}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(false)}
                    className="px-3 py-2 text-xs text-muted hover:text-ink border border-line rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Examination Year */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Examination Year
              </label>
              <input
                type="number"
                min={1990}
                max={2030}
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                placeholder="2024"
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted mt-1">
                Enter any valid WAEC year (e.g. 2024, 2023, 2022).
              </p>
            </div>

            {/* Auto Paper Title */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Paper Title
              </label>
              <input
                type="text"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                placeholder="WAEC Physics 2024 (Theory & Objectives)"
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary"
              />
            </div>

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">
                    A paper for {duplicateWarning.subject} ({duplicateWarning.year}) already exists
                  </p>
                  <p className="text-amber-800">
                    WAEC permits one master paper per subject and year (containing both Objective and Theory sections). Please change the examination year or subject, or open the existing paper to edit it.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!!duplicateWarning || !year || !(isCustomSubject ? customSubject.trim() : subject.trim())}
              onClick={() => {
                const effectiveSub = isCustomSubject ? customSubject.trim() : subject.trim();
                const dup = checkDuplicate(effectiveSub, year, existingPaper?.id);
                if (dup) {
                  setDuplicateWarning(dup);
                  return;
                }
                setCurrentStep(2);
              }}
              className={cn(
                "px-6 py-2.5 rounded-full text-xs font-semibold transition-colors",
                duplicateWarning || !year || !(isCustomSubject ? customSubject.trim() : subject.trim())
                  ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                  : "bg-[#1A4D2E] text-white hover:bg-[#153e25]"
              )}
            >
              Continue to Sources →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: SOURCES (Separate Objective & Theory Dropzones)   */}
      {/* ========================================================= */}
      {!isProcessing && currentStep === 2 && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step 2 of 4</span>
              <h2 className="font-serif text-2xl text-ink font-bold mt-1">Upload Examination Source Pages</h2>
              <p className="text-xs text-muted font-sans mt-0.5">
                Upload question pages for <strong>{subject} — {year}</strong>. Objective and Theory pages are uploaded separately so each section is recognized cleanly.
              </p>
            </div>

            {processError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 font-medium">
                {processError}
              </div>
            )}

            {/* Dropzone 1: Objective Question Pages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-ink">
                  1. Objective Question Pages
                </span>
                <span className="text-xs text-muted">
                  {objFiles.length} file(s) selected
                </span>
              </div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-2xl p-6 bg-paper/60 hover:bg-paper cursor-pointer transition-colors">
                <UploadCloud className="size-8 text-primary mb-2 opacity-75" />
                <span className="text-xs font-semibold text-ink">Upload Objective Question Pages (Photos or PDF)</span>
                <span className="text-[11px] text-muted mt-0.5">WAEC Paper 1 questions</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files) {
                      setObjFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                  className="hidden"
                />
              </label>

              {objFiles.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {objFiles.map((f, i) => (
                    <li key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-line text-xs font-medium text-ink">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setObjFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted hover:text-red-500 font-bold ml-1"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dropzone 2: Theory Question Pages */}
            <div className="space-y-2 pt-2 border-t border-line/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-ink">
                  2. Theory Question Pages
                </span>
                <span className="text-xs text-muted">
                  {theoryFiles.length} file(s) selected
                </span>
              </div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-2xl p-6 bg-paper/60 hover:bg-paper cursor-pointer transition-colors">
                <UploadCloud className="size-8 text-[#1A4D2E] mb-2 opacity-75" />
                <span className="text-xs font-semibold text-ink">Upload Theory Question Pages (Photos or PDF)</span>
                <span className="text-[11px] text-muted mt-0.5">WAEC Paper 2 questions with subparts</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files) {
                      setTheoryFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                  className="hidden"
                />
              </label>

              {theoryFiles.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {theoryFiles.map((f, i) => (
                    <li key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-line text-xs font-medium text-ink">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setTheoryFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted hover:text-red-500 font-bold ml-1"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dropzone 3: Optional Answer Key Pages */}
            <div className="space-y-2 pt-2 border-t border-line/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-muted">
                  3. Official Answer Key / Corrections (Optional)
                </span>
                <span className="text-xs text-muted">
                  {answerKeyFiles.length} file(s)
                </span>
              </div>
              <label className="flex flex-col items-center justify-center border border-dashed border-line rounded-2xl p-4 bg-paper/30 hover:bg-paper cursor-pointer transition-colors">
                <span className="text-xs font-medium text-muted">Upload Answer Key / Correction Sheet (Optional)</span>
                <span className="text-[10px] text-muted">If omitted, Gemini will solve all questions independently</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files) {
                      setAnswerKeyFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                  className="hidden"
                />
              </label>

              {answerKeyFiles.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {answerKeyFiles.map((f, i) => (
                    <li key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-line text-xs font-medium text-ink">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setAnswerKeyFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted hover:text-red-500 font-bold ml-1"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
              >
                ← Back to Details
              </button>

              <div className="flex items-center gap-2">
                {objectives.length > 0 || theory.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2.5 rounded-full border border-line text-xs font-semibold text-ink"
                  >
                    Skip to Review ({objectives.length + theory.length} Qs) →
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleRunOcrExtraction}
                  disabled={objFiles.length === 0 && theoryFiles.length === 0}
                  className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-semibold hover:bg-[#153e25] disabled:opacity-50 transition-colors shadow-xs"
                >
                  Run OCR & AI Solving →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: QUESTIONS REVIEW (Objective & Theory)             */}
      {/* ========================================================= */}
      {!isProcessing && currentStep === 3 && (
        <div className="space-y-6">
          {/* Header & Section Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step 3 of 4</span>
              <h2 className="font-serif text-2xl text-ink font-bold mt-1">Review & Polish Extracted Questions</h2>
              <p className="text-xs text-muted font-sans mt-0.5">
                {subject} — {year} · {objectives.length} objective · {theory.length} theory questions
              </p>
            </div>

            {/* Section tabs */}
            <div className="flex items-center gap-2 bg-paper p-1 rounded-2xl border border-line">
              <button
                type="button"
                onClick={() => setActiveSectionTab("objective")}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeSectionTab === "objective"
                    ? "bg-[#1A4D2E] text-white shadow-2xs"
                    : "text-muted hover:text-ink"
                )}
              >
                Objective ({objectives.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionTab("theory")}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeSectionTab === "theory"
                    ? "bg-[#1A4D2E] text-white shadow-2xs"
                    : "text-muted hover:text-ink"
                )}
              >
                Theory ({theory.length})
              </button>
            </div>
          </div>

          {/* Conflict warnings banner if present */}
          {conflicts.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{conflicts.length} Answer Key Disagreement(s) Flagged</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-amber-950 font-sans">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    Question {c.questionNumber}: Gemini solved <strong>Option {c.solvedAnswer}</strong>, while official key marked <strong>Option {c.keyAnswer}</strong>.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* OBJECTIVE QUESTIONS LIST */}
          {activeSectionTab === "objective" && (
            <div className="space-y-4">
              {objectives.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-paper/40 p-8 text-center text-xs text-muted">
                  No objective questions extracted yet. Return to Sources to upload Paper 1 question pages.
                </div>
              ) : (
                objectives.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className={cn(
                      "rounded-2xl border p-5 bg-surface space-y-3 shadow-2xs transition-all",
                      q.needsReview ? "border-amber-300 bg-amber-50/30" : "border-line"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-[#1A4D2E] text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-serif font-bold text-sm text-ink">
                          Question {idx + 1}
                        </span>
                        {q.needsReview && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠️ Needs Review
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Answer: {q.answer}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteQModal({ type: "obj", index: idx })}
                          className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {q.reviewReason && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <strong>Review Note:</strong> {q.reviewReason}
                      </p>
                    )}

                    {/* Question prompt */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Question Prompt
                      </label>
                      <textarea
                        rows={2}
                        value={q.prompt}
                        onChange={(e) => {
                          const next = [...objectives];
                          next[idx] = { ...q, prompt: e.target.value };
                          setObjectives(next);
                        }}
                        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs sm:text-sm font-sans text-ink outline-none"
                      />
                    </div>

                    {/* Options A-D */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt.key}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border",
                            q.answer === opt.key
                              ? "border-emerald-400 bg-emerald-50/50"
                              : "border-line bg-paper"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...objectives];
                              next[idx] = { ...q, answer: opt.key as Choice, needsReview: false };
                              setObjectives(next);
                            }}
                            className={cn(
                              "size-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 border",
                              q.answer === opt.key
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "border-line text-muted"
                            )}
                          >
                            {opt.key}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const next = [...objectives];
                              const newOpts = q.options.map((o) =>
                                o.key === opt.key ? { ...o, text: e.target.value } : o
                              );
                              next[idx] = { ...q, options: newOpts };
                              setObjectives(next);
                            }}
                            className="w-full bg-transparent text-xs text-ink outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Explanation & Calculation Working
                      </label>
                      <textarea
                        rows={2}
                        value={q.explain || ""}
                        onChange={(e) => {
                          const next = [...objectives];
                          next[idx] = { ...q, explain: e.target.value };
                          setObjectives(next);
                        }}
                        placeholder="Formula, steps, and explanation for students..."
                        className="w-full rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-mono text-ink outline-none"
                      />
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => {
                  setObjectives((prev) => [
                    ...prev,
                    {
                      id: `manual-q-${Date.now()}`,
                      prompt: "New multiple choice question",
                      options: [
                        { key: "A", text: "Option A" },
                        { key: "B", text: "Option B" },
                        { key: "C", text: "Option C" },
                        { key: "D", text: "Option D" },
                      ],
                      answer: "A",
                      explain: "Explanation here.",
                      reviewStatus: "Teacher Reviewed",
                    },
                  ]);
                }}
                className="w-full py-2.5 rounded-xl border border-dashed border-line bg-surface text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                + Add Objective Question Manually
              </button>
            </div>
          )}

          {/* THEORY QUESTIONS LIST */}
          {activeSectionTab === "theory" && (
            <div className="space-y-4">
              {theory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-paper/40 p-8 text-center text-xs text-muted">
                  No theory questions extracted yet. Return to Sources to upload Paper 2 theory question pages.
                </div>
              ) : (
                theory.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="rounded-2xl border border-line p-5 bg-surface space-y-4 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-[#1A4D2E] text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-serif font-bold text-sm text-ink">
                          Theory Question {idx + 1}
                        </span>
                        <span className="text-xs text-muted font-medium">
                          ({(t.parts || []).length} hierarchical subparts)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteQModal({ type: "theory", index: idx })}
                          className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Recreated Vector SVG Diagram if present */}
                    {t.diagramSvg && (
                      <div className="space-y-1.5 my-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider">
                          <span>Recreated Diagram (Vector SVG)</span>
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

                    {/* Question Stem */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Question Stem / Prompt
                      </label>
                      <textarea
                        rows={2}
                        value={t.prompt}
                        onChange={(e) => {
                          const next = [...theory];
                          next[idx] = { ...t, prompt: e.target.value };
                          setTheory(next);
                        }}
                        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs sm:text-sm font-sans text-ink outline-none"
                      />
                    </div>

                    {/* Hierarchical Subparts Editor */}
                    <div className="space-y-3 pt-2 border-t border-line/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                          Hierarchical Subparts
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...theory];
                            const curParts = t.parts || [];
                            const nextLabel = `${idx + 1}${String.fromCharCode(97 + curParts.length)}.`;
                            next[idx] = {
                              ...t,
                              parts: [
                                ...curParts,
                                { label: nextLabel, questionText: "", directAnswer: "", tutorExplanation: "", marks: "[2 marks]" },
                              ],
                            };
                            setTheory(next);
                          }}
                          className="text-xs font-semibold text-[#1A4D2E] hover:underline"
                        >
                          + Add Subpart
                        </button>
                      </div>

                      {(t.parts || []).map((p, pIdx) => {
                        const depth = getTheoryPartDepth(p.label);
                        const indentClass = getTheoryIndentClass(depth);

                        return (
                          <div
                            key={pIdx}
                            className={cn(
                              "rounded-xl border border-line bg-paper/60 p-3.5 space-y-2.5 shadow-2xs",
                              indentClass
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={p.label}
                                  onChange={(e) => {
                                    const next = [...theory];
                                    const nextParts = [...(t.parts || [])];
                                    nextParts[pIdx] = { ...p, label: e.target.value };
                                    next[idx] = { ...t, parts: nextParts };
                                    setTheory(next);
                                  }}
                                  className="w-16 rounded-lg border border-line px-2 py-1 font-bold text-ink text-xs bg-surface"
                                  placeholder="1a."
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
                                    const next = [...theory];
                                    const nextParts = [...(t.parts || [])];
                                    nextParts[pIdx] = { ...p, marks: e.target.value };
                                    next[idx] = { ...t, parts: nextParts };
                                    setTheory(next);
                                  }}
                                  placeholder="[2 marks]"
                                  className="w-20 rounded-lg border border-line px-2 py-0.5 text-xs text-muted font-medium text-right bg-surface"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...theory];
                                    const nextParts = (t.parts || []).filter((_, k) => k !== pIdx);
                                    next[idx] = { ...t, parts: nextParts };
                                    setTheory(next);
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
                                const next = [...theory];
                                const nextParts = [...(t.parts || [])];
                                nextParts[pIdx] = { ...p, questionText: e.target.value };
                                next[idx] = { ...t, parts: nextParts };
                                setTheory(next);
                              }}
                              placeholder="Subpart question prompt..."
                              className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                            />

                            {/* Direct Answer with subtle green border */}
                            <div className="border-l-4 border-emerald-500 bg-emerald-50/70 p-2.5 rounded-r-lg space-y-1">
                              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                                Direct Answer / Model Solution:
                              </span>
                              <textarea
                                rows={2}
                                value={p.directAnswer}
                                onChange={(e) => {
                                  const next = [...theory];
                                  const nextParts = [...(t.parts || [])];
                                  nextParts[pIdx] = { ...p, directAnswer: e.target.value };
                                  next[idx] = { ...t, parts: nextParts };
                                  setTheory(next);
                                }}
                                placeholder="Direct calculation steps and answer..."
                                className="w-full rounded border border-emerald-200 bg-white px-2 py-1 font-mono text-[11px] text-ink"
                              />
                            </div>

                            {/* Tutor Explanation */}
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
                                    const next = [...theory];
                                    const nextParts = [...(t.parts || [])];
                                    nextParts[pIdx] = { ...p, tutorExplanation: e.target.value };
                                    next[idx] = { ...t, parts: nextParts };
                                    setTheory(next);
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
                ))
              )}

              <button
                type="button"
                onClick={() => {
                  setTheory((prev) => [
                    ...prev,
                    {
                      id: `manual-th-${Date.now()}`,
                      prompt: "New theory question stem",
                      parts: [
                        { label: `${prev.length + 1}a.`, questionText: "Part statement", directAnswer: "Model answer", tutorExplanation: "Guidance", marks: "[3 marks]" },
                      ],
                      marks: 5,
                      modelAnswer: "Overall model answer",
                      reviewStatus: "Teacher Reviewed",
                    },
                  ]);
                }}
                className="w-full py-2.5 rounded-xl border border-dashed border-line bg-surface text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                + Add Theory Question Manually
              </button>
            </div>
          )}

          {/* Delete question confirmation modal */}
          {deleteQModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-xl space-y-3">
                <h4 className="font-serif font-bold text-base text-ink">Remove Question?</h4>
                <p className="text-xs text-muted">
                  Are you sure you want to remove this question from the paper?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteQModal(null)}
                    className="px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteQModal.type === "obj") {
                        setObjectives((prev) => prev.filter((_, i) => i !== deleteQModal.index));
                      } else {
                        setTheory((prev) => prev.filter((_, i) => i !== deleteQModal.index));
                      }
                      setDeleteQModal(null);
                    }}
                    className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-2 pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
            >
              ← Back to Sources
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-semibold hover:bg-[#153e25] transition-colors"
            >
              Continue to Preview & Publish →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4: PREVIEW & PUBLISH                                 */}
      {/* ========================================================= */}
      {!isProcessing && currentStep === 4 && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step 4 of 4</span>
              <h2 className="font-serif text-2xl text-ink font-bold mt-1">Preview & Publishing</h2>
              <p className="text-xs text-muted font-sans mt-0.5">
                Review publication readiness for <strong>{paperTitle}</strong>.
              </p>
            </div>

            {/* Summary Card */}
            <div className="rounded-2xl border border-line bg-paper/60 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h3 className="font-serif font-bold text-lg text-ink">{subject} — {year}</h3>
                  <p className="text-xs text-muted">{paperTitle}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {existingPaper?.status || "Draft"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-xs text-muted block">Objective</span>
                  <strong className="text-lg font-bold text-ink">{objectives.length} Qs</strong>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-xs text-muted block">Theory</span>
                  <strong className="text-lg font-bold text-[#1A4D2E]">{theory.length} Qs</strong>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-xs text-muted block">Total Qs</span>
                  <strong className="text-lg font-bold text-ink">{objectives.length + theory.length}</strong>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-xs text-muted block">Conflicts</span>
                  <strong className={cn("text-lg font-bold", conflicts.length > 0 ? "text-amber-600" : "text-emerald-700")}>
                    {conflicts.length}
                  </strong>
                </div>
              </div>
            </div>

            {/* Warnings Alert if any */}
            {(conflicts.length > 0 || objectives.some((o) => o.needsReview) || theory.some((t) => t.needsReview)) && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="size-4" />
                  <span>Unresolved Review Items</span>
                </div>
                <p>
                  Some questions have review flags or answer-key conflicts. You can still save as draft, mark In Review, or approve and publish.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
              >
                ← Back to Questions
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave("draft")}
                  className="px-4 py-2.5 rounded-full border border-line bg-surface text-xs font-semibold text-ink hover:border-primary transition-colors"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSave("reviewing")}
                  className="px-4 py-2.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold hover:bg-amber-200 transition-colors"
                >
                  Mark In Review
                </button>

                <button
                  type="button"
                  onClick={() => handleSave("published")}
                  className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-semibold hover:bg-[#153e25] transition-colors shadow-xs"
                >
                  ✓ Publish Paper Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
