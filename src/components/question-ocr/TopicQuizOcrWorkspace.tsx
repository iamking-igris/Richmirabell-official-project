import React, { useState, useRef } from "react";
import { classifyAiExtractionFailure } from "@/lib/content-errors";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import type { Choice, Question, TheoryQuestion, TheoryPart, ReviewStatus } from "@/data/catalog";
import {
  extractQuestionsFromPage,
  extractTheoryFromPage,
} from "@/lib/question-ocr-service";
import { cn } from "@/lib/cn";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import {
  getTheoryPartDepth,
  getTheoryIndentClass,
  sanitizeSvg,
} from "@/lib/theory-hierarchy";

export interface TopicQuizOcrWorkspaceProps {
  topicTitle: string;
  onImportToTopic: (imported: { questions: Question[]; theory?: TheoryQuestion[] }) => void;
  onNavigateToQuestionsTab?: () => void;
}

export interface ExtractedObjectivePreviewItem {
  type: "multiple_choice";
  id: string;
  num: string;
  prompt: string;
  options: { key: Choice; text: string }[];
  answer: Choice;
  explain: string;
  needsReview: boolean;
  reviewReason?: string;
  reviewStatus: ReviewStatus;
  sourceOrigin: "ai_solved" | "key_matched" | "manual";
}

export interface TheorySubpart {
  label: string;
  prompt: string;
  modelAnswer: string;
  marks?: number;
}

export interface ExtractedTheoryPreviewItem {
  type: "theory";
  id: string;
  num: string;
  introText?: string;
  prompt: string;
  modelAnswer: string;
  marks?: number;
  explain?: string;
  parts?: TheoryPart[];
  subparts?: TheorySubpart[];
  diagramSvg?: string;
  diagramCaption?: string;
  needsReview: boolean;
  reviewReason?: string;
  reviewStatus: ReviewStatus;
  sourceOrigin: "ai_solved" | "key_matched" | "manual";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

const KEYS: Choice[] = ["A", "B", "C", "D"];

export function TopicQuizOcrWorkspace({
  topicTitle,
  onImportToTopic,
  onNavigateToQuestionsTab,
}: TopicQuizOcrWorkspaceProps) {
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [theoryFiles, setTheoryFiles] = useState<File[]>([]);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingMsg, setExtractingMsg] = useState("");
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [previewTab, setPreviewTab] = useState<"objective" | "theory">("objective");
  const [extractedObjectiveItems, setExtractedObjectiveItems] = useState<ExtractedObjectivePreviewItem[]>([]);
  const [extractedTheoryItems, setExtractedTheoryItems] = useState<ExtractedTheoryPreviewItem[]>([]);

  const [importedSummary, setImportedSummary] = useState<{ obj: number; theory: number } | null>(null);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const theoryInputRef = useRef<HTMLInputElement>(null);

  const [isQDragging, setIsQDragging] = useState(false);
  const [isTDragging, setIsTDragging] = useState(false);

  // Handle Objective Question File Addition
  function handleAddQuestionFiles(incoming: FileList | File[]) {
    const valid = Array.from(incoming).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (valid.length === 0) {
      setOcrError("Please upload valid image files (JPG, PNG, WebP) or PDF.");
      return;
    }
    setOcrError(null);
    setQuestionFiles((prev) => [...prev, ...valid]);
  }

  // Handle Theory Question File Addition
  function handleAddTheoryFiles(incoming: FileList | File[]) {
    const valid = Array.from(incoming).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (valid.length === 0) {
      setOcrError("Please upload valid image files (JPG, PNG, WebP) or PDF.");
      return;
    }
    setOcrError(null);
    setTheoryFiles((prev) => [...prev, ...valid]);
  }

  // Run Real OCR Extraction & AI Solving
  async function handleRunExtraction() {
    if (isExtracting) return;
    if (questionFiles.length === 0 && theoryFiles.length === 0) {
      setOcrError("Please upload at least one Objective or Theory question page photo or PDF.");
      return;
    }

    setIsExtracting(true);
    setOcrError(null);
    setImportedSummary(null);
    setExtractingMsg("Gemini is reading examination pages and independently solving answers...");

    const batchId = `topic-batch-${Date.now()}`;
    const objList: ExtractedObjectivePreviewItem[] = [];
    const theoryList: ExtractedTheoryPreviewItem[] = [];
    const extractionErrors: string[] = [];

    try {
      // 1. Process Objective Question Pages
      if (questionFiles.length > 0) {
        for (let i = 0; i < questionFiles.length; i++) {
          const file = questionFiles[i];
          setExtractingMsg(`Extracting & solving objective questions from ${file.name} (page ${i + 1} of ${questionFiles.length})...`);
          try {
            const base64 = await fileToBase64(file);
            const res = await extractQuestionsFromPage(
              base64,
              file.type || "image/jpeg",
              file.name,
              batchId,
              `qfile-${i}`,
              i + 1
            );

            if (res.ok) {
              for (const q of res.questions) {
                const isMCQ = q.type === "multiple_choice" || (q.options && q.options.length > 0);
                if (isMCQ) {
                  const optionsList: { key: Choice; text: string }[] = KEYS.map((k) => {
                    const foundOpt = q.options?.find((o: any) => o.key === k);
                    return { key: k, text: foundOpt ? foundOpt.text : "" };
                  });

                  const aiSolved = q.solvedAnswer?.toUpperCase();
                  const isValidKey = aiSolved && KEYS.includes(aiSolved as Choice);
                  const finalAns: Choice = isValidKey ? (aiSolved as Choice) : "A";
                  let needsReview = Boolean(q.needsReview || q.hasWarning || !isValidKey);
                  let reviewReason = q.reviewReason || q.warningDetails;

                  if (!isValidKey && !reviewReason) {
                    reviewReason = "Gemini could not definitively determine the correct option from question content. Please select the correct option.";
                  }

                  objList.push({
                    type: "multiple_choice",
                    id: `mcq-${objList.length}-${Date.now()}`,
                    num: q.questionNumber || String(objList.length + 1),
                    prompt: q.prompt || "",
                    options: optionsList,
                    answer: finalAns,
                    explain: q.explanation || "",
                    needsReview,
                    reviewReason,
                    reviewStatus: needsReview ? "Needs Review" : "AI Solved",
                    sourceOrigin: "ai_solved",
                  });
                } else {
                  // If a theory question appeared on this page
                  const hasModelAns = Boolean(q.modelAnswer);
                  theoryList.push({
                    type: "theory",
                    id: `th-mix-${theoryList.length}-${Date.now()}`,
                    num: q.questionNumber || String(theoryList.length + 1),
                    prompt: q.prompt || "",
                    modelAnswer: q.modelAnswer || "",
                    marks: q.marks || 5,
                    explain: q.explanation || "",
                    subparts: q.subparts || [],
                    needsReview: Boolean(q.needsReview || !hasModelAns),
                    reviewReason: q.reviewReason || (!hasModelAns ? "Model answer requires teacher review." : undefined),
                    reviewStatus: q.needsReview || !hasModelAns ? "Needs Review" : "AI Solved",
                    sourceOrigin: "ai_solved",
                  });
                }
              }
            } else {
              extractionErrors.push(`${file.name}: ${res.message}`);
            }
          } catch (fileErr: any) {
            extractionErrors.push(`${file.name}: ${fileErr?.message || "Failed to read this file."}`);
          }
        }
      }

      // 2. Process Dedicated Theory Question Pages
      if (theoryFiles.length > 0) {
        for (let i = 0; i < theoryFiles.length; i++) {
          const file = theoryFiles[i];
          setExtractingMsg(`Extracting & solving theory questions with full subparts from ${file.name} (page ${i + 1} of ${theoryFiles.length})...`);
          try {
            const base64 = await fileToBase64(file);
            const res = await extractTheoryFromPage(
              base64,
              file.type || "image/jpeg",
              file.name,
              batchId,
              `thfile-${i}`,
              i + 1
            );

            if (res.ok) {
              for (const t of res.theoryQuestions) {
                const hasModelAns = Boolean(
                  (t.modelAnswer && t.modelAnswer.trim().length > 0) ||
                  (t.parts && t.parts.some((p: any) => p.directAnswer))
                );
                const needsReview = Boolean(t.needsReview || t.hasWarning || !hasModelAns);
                const reviewReason = t.reviewReason || t.warningDetails || (!hasModelAns ? "Model answer requires teacher review." : undefined);
                const diagramSvg = sanitizeSvg(t.diagramSvg);

                let parts: TheoryPart[] = [];
                if (Array.isArray(t.parts) && t.parts.length > 0) {
                  parts = t.parts.map((p: any) => ({
                    label: String(p.label || "").trim(),
                    questionText: String(p.questionText || p.prompt || "").trim(),
                    directAnswer: String(p.directAnswer || p.modelAnswer || "").trim(),
                    tutorExplanation: String(p.tutorExplanation || p.explanation || p.explain || "").trim(),
                    marks: p.marks ? String(p.marks).trim() : undefined,
                  }));
                } else if (Array.isArray(t.subparts) && t.subparts.length > 0) {
                  if (t.prompt && t.prompt.trim()) {
                    parts.push({
                      label: t.questionNumber ? `${t.questionNumber}.` : "1.",
                      questionText: t.prompt.trim(),
                      directAnswer: t.modelAnswer ? t.modelAnswer.trim() : "",
                      tutorExplanation: t.explain ? t.explain.trim() : "",
                      marks: t.marks ? `[${t.marks} marks]` : undefined,
                    });
                  }
                  for (const sp of t.subparts) {
                    parts.push({
                      label: String(sp.label || "").trim(),
                      questionText: String(sp.prompt || sp.questionText || "").trim(),
                      directAnswer: String(sp.modelAnswer || sp.directAnswer || "").trim(),
                      tutorExplanation: String(sp.tutorExplanation || sp.explain || "").trim(),
                      marks: sp.marks ? (typeof sp.marks === "number" ? `[${sp.marks} marks]` : String(sp.marks)) : undefined,
                    });
                  }
                } else if (t.prompt) {
                  parts.push({
                    label: t.questionNumber ? `${t.questionNumber}.` : "1.",
                    questionText: t.prompt.trim(),
                    directAnswer: t.modelAnswer ? t.modelAnswer.trim() : "",
                    tutorExplanation: t.explain ? t.explain.trim() : "",
                    marks: t.marks ? `[${t.marks} marks]` : undefined,
                  });
                }

                theoryList.push({
                  type: "theory",
                  id: `th-${theoryList.length}-${Date.now()}`,
                  num: t.questionNumber || String(theoryList.length + 1),
                  introText: t.introText,
                  prompt: t.prompt || (parts[0]?.questionText ?? ""),
                  modelAnswer: t.modelAnswer || (parts[0]?.directAnswer ?? ""),
                  marks: typeof t.marks === "number" ? t.marks : 5,
                  explain: t.explain || (parts[0]?.tutorExplanation ?? ""),
                  parts,
                  subparts: Array.isArray(t.subparts) ? t.subparts : [],
                  diagramSvg,
                  diagramCaption: t.diagramCaption,
                  needsReview,
                  reviewReason,
                  reviewStatus: needsReview ? "Needs Review" : (t.reviewStatus || "AI Solved"),
                  sourceOrigin: "ai_solved",
                });
              }
            } else {
              extractionErrors.push(`${file.name}: ${res.message}`);
            }
          } catch (fileErr: any) {
            extractionErrors.push(`${file.name}: ${fileErr?.message || "Failed to read this file."}`);
          }
        }
      }

      if (extractionErrors.length > 0) {
        setOcrError(extractionErrors.join(" "));
      }

      if (objList.length === 0 && theoryList.length === 0) {
        if (extractionErrors.length === 0) {
          setOcrError("No legible questions were extracted. Try a clearer, higher-contrast image or PDF page.");
        }
        // Keep selected files so the admin can retry or adjust without re-uploading.
      } else {
        setExtractedObjectiveItems(objList);
        setExtractedTheoryItems(theoryList);
        setPreviewTab(objList.length > 0 ? "objective" : "theory");
        // Preserve per-file errors as a notice only when some items were extracted.
        if (extractionErrors.length > 0) {
          setOcrError(`Some pages could not be processed: ${extractionErrors.join(" ")}`);
        }
      }
    } catch (err: any) {
      const failure = classifyAiExtractionFailure(
        err,
        err?.message || "Failed to process OCR extraction. Please check your image clarity.",
      );
      setOcrError(failure.message);
    } finally {
      setIsExtracting(false);
      setExtractingMsg("");
    }
  }

  // Objective item updates
  function updateObjectiveItem(index: number, patch: Partial<ExtractedObjectivePreviewItem>) {
    setExtractedObjectiveItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeObjectiveItem(index: number) {
    setExtractedObjectiveItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddBlankObjective() {
    setExtractedObjectiveItems((prev) => [
      ...prev,
      {
        type: "multiple_choice",
        id: `manual-obj-${Date.now()}`,
        num: String(prev.length + 1),
        prompt: "",
        options: KEYS.map((k) => ({ key: k, text: "" })),
        answer: "A",
        explain: "Teacher manual entry.",
        needsReview: false,
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "manual",
      },
    ]);
  }

  // Theory item updates
  function updateTheoryItem(index: number, patch: Partial<ExtractedTheoryPreviewItem>) {
    setExtractedTheoryItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeTheoryItem(index: number) {
    setExtractedTheoryItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddBlankTheory() {
    setExtractedTheoryItems((prev) => [
      ...prev,
      {
        type: "theory",
        id: `manual-theory-${Date.now()}`,
        num: String(prev.length + 1),
        prompt: "",
        modelAnswer: "",
        marks: 5,
        explain: "Teacher manual entry.",
        subparts: [],
        needsReview: false,
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "manual",
      },
    ]);
  }

  function handleAddSubpart(theoryIdx: number) {
    const item = extractedTheoryItems[theoryIdx];
    const subparts = item.subparts || [];
    const nextLabel = `(${String.fromCharCode(97 + subparts.length)})`;
    const updatedSubparts = [
      ...subparts,
      { label: nextLabel, prompt: "", modelAnswer: "", marks: 2 },
    ];
    updateTheoryItem(theoryIdx, { subparts: updatedSubparts });
  }

  function handleAddTheoryPart(theoryIdx: number) {
    const item = extractedTheoryItems[theoryIdx];
    const parts = item.parts || [];
    const num = item.num || "1";
    const nextLabel = parts.length === 0 ? `${num}.` : `${num}${String.fromCharCode(97 + parts.length - 1)}.`;
    const updatedParts: TheoryPart[] = [
      ...parts,
      { label: nextLabel, questionText: "", directAnswer: "", tutorExplanation: "", marks: "[2 marks]" },
    ];
    updateTheoryItem(theoryIdx, { parts: updatedParts });
  }

  function handleUpdateTheoryPart(theoryIdx: number, partIdx: number, patch: Partial<TheoryPart>) {
    const item = extractedTheoryItems[theoryIdx];
    const parts = [...(item.parts || [])];
    parts[partIdx] = { ...parts[partIdx], ...patch };
    updateTheoryItem(theoryIdx, { parts });
  }

  function handleRemoveTheoryPart(theoryIdx: number, partIdx: number) {
    const item = extractedTheoryItems[theoryIdx];
    const parts = (item.parts || []).filter((_, i) => i !== partIdx);
    updateTheoryItem(theoryIdx, { parts });
  }

  // Final Import into Questions collection
  function handleConfirmImport() {
    const totalCount = extractedObjectiveItems.length + extractedTheoryItems.length;
    if (totalCount === 0) return;

    const catalogObjective: Question[] = extractedObjectiveItems.map((item, idx) => ({
      id: `topic-q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      prompt: item.prompt.trim(),
      options: item.options.map((o) => ({ key: o.key, text: o.text.trim() })),
      answer: item.answer,
      explain: item.explain.trim(),
      answerKeyStatus: "shipped",
      needsReview: item.needsReview,
      reviewReason: item.reviewReason,
      reviewStatus: item.reviewStatus,
      sourceOrigin: item.sourceOrigin,
    }));

    const catalogTheory: TheoryQuestion[] = extractedTheoryItems.map((item, idx) => ({
      id: `topic-t-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      introText: item.introText,
      prompt: item.prompt.trim(),
      modelAnswer: item.modelAnswer.trim(),
      marks: item.marks || 5,
      explain: item.explain?.trim(),
      parts: item.parts,
      subparts: item.subparts,
      diagramSvg: item.diagramSvg,
      diagramCaption: item.diagramCaption,
      needsReview: item.needsReview,
      reviewReason: item.reviewReason,
      reviewStatus: item.reviewStatus,
      sourceOrigin: item.sourceOrigin,
    }));

    onImportToTopic({ questions: catalogObjective, theory: catalogTheory });
    setImportedSummary({ obj: catalogObjective.length, theory: catalogTheory.length });
    setExtractedObjectiveItems([]);
    setExtractedTheoryItems([]);
  }

  const totalExtracted = extractedObjectiveItems.length + extractedTheoryItems.length;

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {importedSummary !== null && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="size-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="font-serif font-bold text-emerald-950 text-base">
                Successfully added {importedSummary.obj} objective & {importedSummary.theory} theory question(s)!
              </p>
              <p className="font-sans text-xs text-emerald-800 mt-0.5">
                Questions have been imported into <strong>{topicTitle}</strong>. You can view, edit, or mark as Teacher Reviewed in the Questions tab.
              </p>
            </div>
          </div>
          {onNavigateToQuestionsTab && (
            <button
              type="button"
              onClick={onNavigateToQuestionsTab}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-sans text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
            >
              Go to Questions Tab →
            </button>
          )}
        </div>
      )}

      {/* Loading State: Concentric Spinning Circles matching Lesson Note OCR */}
      {isExtracting ? (
        <div className="rounded-3xl border-2 border-dashed border-[#1A4D2E]/30 bg-[#FDFBF7] p-10 text-center shadow-xs">
          <div className="py-8">
            {/* Concentric Spinner Animation */}
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
              {extractingMsg}
            </p>
          </div>
        </div>
      ) : totalExtracted > 0 ? (
        /* Extracted Questions Preview */
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-semibold uppercase tracking-wider">
                Extracted Questions & AI Solutions Preview
              </span>
              <h3 className="font-serif text-2xl text-[#2A2422] font-medium tracking-tight mt-1">
                Extracted Quiz Questions ({totalExtracted})
              </h3>
              <p className="text-xs text-muted font-sans mt-0.5">
                Review and fine-tune questions, subparts, and AI model answers before adding them to <strong>{topicTitle}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-full bg-[#1A4D2E] text-white font-sans text-xs font-semibold hover:bg-[#153e25] transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>📥 Add to Topic Quiz ({totalExtracted})</span>
              </button>
            </div>
          </div>

          {/* Subtabs for Objective vs Theory Questions */}
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <button
              type="button"
              onClick={() => setPreviewTab("objective")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-sans font-semibold transition-all flex items-center gap-2",
                previewTab === "objective"
                  ? "bg-[#1A4D2E] text-white shadow-2xs"
                  : "bg-surface border border-line text-muted hover:text-ink"
              )}
            >
              <span>Objective Questions ({extractedObjectiveItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("theory")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-sans font-semibold transition-all flex items-center gap-2",
                previewTab === "theory"
                  ? "bg-[#1A4D2E] text-white shadow-2xs"
                  : "bg-surface border border-line text-muted hover:text-ink"
              )}
            >
              <span>Theory Questions ({extractedTheoryItems.length})</span>
            </button>
          </div>

          {/* OBJECTIVE QUESTIONS PREVIEW */}
          {previewTab === "objective" && (
            <div className="space-y-4">
              {extractedObjectiveItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-8 text-center text-xs text-muted">
                  No objective questions extracted from this page.
                </div>
              ) : (
                extractedObjectiveItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-5 shadow-2xs space-y-3 transition-all",
                      item.reviewStatus === "Needs Review"
                        ? "border-amber-300 bg-amber-50/40"
                        : item.reviewStatus === "Teacher Reviewed"
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-[#E5E0D8] bg-[#FDFBF7]"
                    )}
                  >
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E0D8] pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="size-6 rounded-full bg-[#1A4D2E] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-serif font-bold text-sm text-[#2A2422]">
                          Question {item.num || idx + 1}
                        </span>

                        {/* Review Status Selector Badge */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateObjectiveItem(idx, {
                                reviewStatus:
                                  item.reviewStatus === "Teacher Reviewed"
                                    ? "AI Solved"
                                    : "Teacher Reviewed",
                                needsReview: false,
                              })
                            }
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors flex items-center gap-1",
                              item.reviewStatus === "Teacher Reviewed"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : item.reviewStatus === "Needs Review"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-blue-100 text-blue-800 border-blue-300"
                            )}
                          >
                            <span>
                              {item.reviewStatus === "Teacher Reviewed"
                                ? "✓ Teacher Reviewed"
                                : item.reviewStatus === "Needs Review"
                                ? "⚠️ Needs Review"
                                : "⚡ AI Solved"}
                            </span>
                            <span className="text-[9px] opacity-75">(click to toggle)</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeObjectiveItem(idx)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Needs Review Alert Banner */}
                    {item.needsReview && (
                      <div className="rounded-xl border border-amber-300 bg-amber-100/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                        <span className="font-bold text-amber-700 shrink-0">⚠️ Review Reason:</span>
                        <p>{item.reviewReason || "Gemini flagged potential ambiguity in the question or diagram."}</p>
                      </div>
                    )}

                    {/* Prompt textarea */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Question Prompt
                      </label>
                      <textarea
                        rows={2}
                        value={item.prompt}
                        onChange={(e) => updateObjectiveItem(idx, { prompt: e.target.value })}
                        placeholder="Enter question statement..."
                        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-sans text-ink focus:border-[#1A4D2E] outline-none"
                      />
                    </div>

                    {/* Options grid */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Options A–D
                      </label>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {item.options.map((opt, optIdx) => (
                          <div key={opt.key} className="flex items-center gap-2">
                            <span className="size-6 rounded-full bg-line font-bold text-xs flex items-center justify-center shrink-0 text-ink">
                              {opt.key}
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const nextOpts = [...item.options];
                                nextOpts[optIdx] = { ...opt, text: e.target.value };
                                updateObjectiveItem(idx, { options: nextOpts });
                              }}
                              placeholder={`Option ${opt.key}...`}
                              className="w-full rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-sans text-ink outline-none focus:border-[#1A4D2E]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Correct Answer Selection & Student Explanation */}
                    <div className="grid sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                          Correct Option (AI Solved)
                        </label>
                        <div className="flex items-center gap-1.5">
                          {KEYS.map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => updateObjectiveItem(idx, { answer: key })}
                              className={cn(
                                "size-8 rounded-full font-bold text-xs transition-all flex items-center justify-center",
                                item.answer === key
                                  ? "bg-[#1A4D2E] text-white shadow-2xs scale-105"
                                  : "bg-surface border border-line text-muted hover:text-ink"
                              )}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                          Explanation / Step-by-Step Working
                        </label>
                        <textarea
                          rows={2}
                          value={item.explain}
                          onChange={(e) => updateObjectiveItem(idx, { explain: e.target.value })}
                          placeholder="Student-facing educational explanation..."
                          className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-sans text-ink outline-none focus:border-[#1A4D2E]"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddBlankObjective}
                className="w-full py-2.5 rounded-xl border border-dashed border-line bg-surface text-xs font-semibold text-muted hover:text-ink hover:border-primary/50 transition-colors"
              >
                + Add Objective Question Manually
              </button>
            </div>
          )}

          {/* THEORY QUESTIONS PREVIEW */}
          {previewTab === "theory" && (
            <div className="space-y-4">
              {extractedTheoryItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-8 text-center text-xs text-muted">
                  No theory questions extracted from this page.
                </div>
              ) : (
                extractedTheoryItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-5 shadow-2xs space-y-3 transition-all",
                      item.reviewStatus === "Needs Review"
                        ? "border-amber-300 bg-amber-50/40"
                        : item.reviewStatus === "Teacher Reviewed"
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-[#E5E0D8] bg-[#FDFBF7]"
                    )}
                  >
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E0D8] pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="size-6 rounded-full bg-[#1A4D2E] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-serif font-bold text-sm text-[#2A2422]">
                          Theory Question {item.num || idx + 1}
                        </span>

                        {/* Review Status Badge */}
                        <button
                          type="button"
                          onClick={() =>
                            updateTheoryItem(idx, {
                              reviewStatus:
                                item.reviewStatus === "Teacher Reviewed"
                                  ? "AI Solved"
                                  : "Teacher Reviewed",
                              needsReview: false,
                            })
                          }
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors flex items-center gap-1",
                            item.reviewStatus === "Teacher Reviewed"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : item.reviewStatus === "Needs Review"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-teal-100 text-teal-800 border-teal-300"
                          )}
                        >
                          <span>
                            {item.reviewStatus === "Teacher Reviewed"
                              ? "✓ Teacher Reviewed"
                              : item.reviewStatus === "Needs Review"
                              ? "⚠️ Needs Review"
                              : "⚡ AI Solved"}
                          </span>
                          <span className="text-[9px] opacity-75">(click to toggle)</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <label htmlFor={`marks-${item.id}`} className="font-semibold uppercase text-[10px]">
                            Marks:
                          </label>
                          <input
                            id={`marks-${item.id}`}
                            type="number"
                            min={1}
                            value={item.marks || 5}
                            onChange={(e) => updateTheoryItem(idx, { marks: Number(e.target.value) || 1 })}
                            className="w-14 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-bold text-ink outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTheoryItem(idx)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Needs Review Banner */}
                    {item.needsReview && (
                      <div className="rounded-xl border border-amber-300 bg-amber-100/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                        <span className="font-bold text-amber-700 shrink-0">⚠️ Review Reason:</span>
                        <p>{item.reviewReason || "Check formulas, diagrams, or working."}</p>
                      </div>
                    )}

                    {/* Recreated Vector SVG Diagram */}
                    {item.diagramSvg && (
                      <div className="space-y-1.5 my-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider">
                          <span>Recreated Diagram (Vector SVG)</span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                            ✓ SVG Clean Vector
                          </span>
                        </div>
                        <div
                          className="diagram-container bg-white p-4 rounded-xl border border-gray-200 flex justify-center items-center my-1 overflow-x-auto min-h-[140px] shadow-2xs"
                          dangerouslySetInnerHTML={{ __html: item.diagramSvg }}
                        />
                        {item.diagramCaption && (
                          <p className="text-center text-xs text-muted italic">Figure: {item.diagramCaption}</p>
                        )}
                      </div>
                    )}

                    {/* Stem / Intro Text */}
                    {item.introText && (
                      <div>
                        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                          Introductory Stem / Context
                        </label>
                        <input
                          type="text"
                          value={item.introText}
                          onChange={(e) => updateTheoryItem(idx, { introText: e.target.value })}
                          placeholder="Intro text before subparts..."
                          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-sans text-ink focus:border-[#1A4D2E] outline-none"
                        />
                      </div>
                    )}

                    {/* Hierarchical Numbered Questions & Model Answers */}
                    <div className="space-y-3 pt-2 border-t border-line/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                            Hierarchical Parts (WAEC / NECO Format)
                          </p>
                          <p className="text-[10px] text-muted font-sans">
                            Each main question, sub-question, and sub-sub-part is numbered and indented hierarchically.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTheoryPart(idx)}
                          className="text-xs font-semibold text-[#1A4D2E] hover:underline"
                        >
                          + Add Hierarchical Part
                        </button>
                      </div>

                      {item.parts && item.parts.length > 0 ? (
                        <div className="space-y-3">
                          {item.parts.map((part, pIdx) => {
                            const depth = getTheoryPartDepth(part.label);
                            const indentClass = getTheoryIndentClass(depth);

                            return (
                              <div
                                key={pIdx}
                                className={cn(
                                  "rounded-2xl border border-line bg-surface p-3.5 space-y-2.5 shadow-2xs transition-all",
                                  indentClass
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={part.label}
                                      onChange={(e) =>
                                        handleUpdateTheoryPart(idx, pIdx, { label: e.target.value })
                                      }
                                      className="w-16 font-bold text-ink rounded-lg border border-line px-2 py-1 text-xs"
                                      placeholder="4a(i)"
                                    />
                                    <span className="text-[10px] text-muted uppercase tracking-wide">
                                      {depth === 0 ? "Main Question" : depth === 1 ? "Sub-Question" : "Sub-sub-part"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={part.marks || ""}
                                      onChange={(e) =>
                                        handleUpdateTheoryPart(idx, pIdx, { marks: e.target.value })
                                      }
                                      placeholder="[2 marks]"
                                      className="w-20 rounded-lg border border-line px-2 py-0.5 text-xs text-muted font-medium text-right"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTheoryPart(idx, pIdx)}
                                      className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                                      title="Remove part"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                {/* Part question statement */}
                                <div>
                                  <input
                                    type="text"
                                    value={part.questionText}
                                    onChange={(e) =>
                                      handleUpdateTheoryPart(idx, pIdx, { questionText: e.target.value })
                                    }
                                    placeholder="Part question prompt (e.g. State Ohm's law, calculate effective resistance)..."
                                    className="w-full rounded-xl border border-line bg-paper/60 px-3 py-1.5 text-xs sm:text-sm text-ink outline-none"
                                  />
                                </div>

                                {/* Direct Answer in green border-left block */}
                                <div className="border-l-4 border-emerald-500 bg-emerald-50/70 p-3 rounded-r-xl space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                                    <CheckCircle2 className="size-3 text-emerald-600" />
                                    <span>Direct Answer / Model Solution:</span>
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={part.directAnswer}
                                    onChange={(e) =>
                                      handleUpdateTheoryPart(idx, pIdx, { directAnswer: e.target.value })
                                    }
                                    placeholder="Direct formula, calculation steps, and final value with units..."
                                    className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-ink outline-none leading-relaxed"
                                  />
                                </div>

                                {/* Tutor Explanation in muted box with lightbulb */}
                                <div className="rounded-xl bg-[#F7F5F0] border border-[#E5E0D8] p-2.5 flex items-start gap-2 text-xs">
                                  <Lightbulb className="size-4 text-amber-500 shrink-0 mt-1" />
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[10px] font-bold text-ink uppercase tracking-wider block">
                                      Tutor Explanation (Step-by-step guidance):
                                    </span>
                                    <textarea
                                      rows={2}
                                      value={part.tutorExplanation}
                                      onChange={(e) =>
                                        handleUpdateTheoryPart(idx, pIdx, { tutorExplanation: e.target.value })
                                      }
                                      placeholder="Beginner-friendly explanation of the concept, common traps, or why this working applies..."
                                      className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 font-sans text-[11px] text-ink outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Fallback single prompt & answer */
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                              Theory Question Statement / Stem
                            </label>
                            <textarea
                              rows={2}
                              value={item.prompt}
                              onChange={(e) => updateTheoryItem(idx, { prompt: e.target.value })}
                              placeholder="Enter theory question prompt..."
                              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-sans text-ink focus:border-[#1A4D2E] outline-none"
                            />
                          </div>

                          <div className="rounded-xl border border-[#1A4D2E]/20 bg-[#1A4D2E]/5 p-3.5 space-y-2">
                            <span className="px-2 py-0.5 rounded-full bg-[#1A4D2E] text-white text-[10px] font-semibold uppercase tracking-wider">
                              AI Model Answer & Step-by-Step Working
                            </span>
                            <textarea
                              rows={4}
                              value={item.modelAnswer}
                              onChange={(e) => updateTheoryItem(idx, { modelAnswer: e.target.value })}
                              placeholder="Model answer with full step-by-step working..."
                              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono text-ink focus:border-[#1A4D2E] outline-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddBlankTheory}
                className="w-full py-2.5 rounded-xl border border-dashed border-line bg-surface text-xs font-semibold text-muted hover:text-ink hover:border-primary/50 transition-colors"
              >
                + Add Theory Question Manually
              </button>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => {
                setExtractedObjectiveItems([]);
                setExtractedTheoryItems([]);
                setQuestionFiles([]);
                setTheoryFiles([]);
              }}
              className="text-xs font-semibold text-muted hover:text-ink"
            >
              ← Clear & Upload Different Pages
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-3 rounded-full bg-[#1A4D2E] text-white font-sans text-xs font-semibold hover:bg-[#153e25] transition-all shadow-xs"
            >
              📥 Add {totalExtracted} Question(s) to Topic Quiz
            </button>
          </div>
        </div>
      ) : (
        /* DUAL UPLOAD WORKFLOW: 1. Objective Questions OCR + 2. Theory Questions OCR */
        <div className="space-y-6">
          {/* Dual Upload Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dropzone 1: Objective Question Pages OCR */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsQDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsQDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsQDragging(false);
                handleAddQuestionFiles(e.dataTransfer.files);
              }}
              onClick={() => questionInputRef.current?.click()}
              className={cn(
                "relative rounded-3xl border-2 border-dashed p-6 text-center transition-all cursor-pointer shadow-xs",
                isQDragging
                  ? "border-[#1A4D2E] bg-[#1A4D2E]/10 scale-[0.99]"
                  : "border-[#1A4D2E]/30 bg-[#FDFBF7] hover:border-[#1A4D2E] hover:bg-[#FDFBF7]/90"
              )}
            >
              <input
                ref={questionInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddQuestionFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              <div className="mx-auto size-12 rounded-2xl bg-[#1A4D2E]/10 text-[#1A4D2E] flex items-center justify-center mb-3">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>

              <div className="flex items-center justify-center gap-2">
                <h4 className="font-serif text-xl text-[#2A2422] font-medium tracking-tight">
                  1. Objective Question OCR
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#1A4D2E] text-white text-[10px] font-semibold uppercase">
                  Multiple Choice
                </span>
              </div>
              <p className="font-sans text-xs text-[#6B6B6B] mt-1 leading-relaxed max-w-xs mx-auto">
                Upload or snap objective question pages. Gemini will extract questions, options A–D, and independently solve each question with clear explanations.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E] px-4 py-2 font-sans text-xs font-semibold text-white shadow-xs hover:bg-[#153e25] transition-colors">
                Select Objective Photos
              </div>

              {/* Selected objective question files list */}
              {questionFiles.length > 0 && (
                <div className="mt-4 space-y-1.5 text-left border-t border-line/60 pt-3" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[11px] font-semibold text-muted uppercase">
                    Selected Objective Files ({questionFiles.length})
                  </p>
                  <ul className="space-y-1">
                    {questionFiles.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between text-xs bg-surface border border-line px-3 py-1.5 rounded-xl"
                      >
                        <span className="truncate font-medium text-ink max-w-[180px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuestionFiles((prev) => prev.filter((_, k) => k !== i))}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Dropzone 2: Theory Question Pages OCR */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsTDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsTDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsTDragging(false);
                handleAddTheoryFiles(e.dataTransfer.files);
              }}
              onClick={() => theoryInputRef.current?.click()}
              className={cn(
                "relative rounded-3xl border-2 border-dashed p-6 text-center transition-all cursor-pointer shadow-xs",
                isTDragging
                  ? "border-[#1A4D2E] bg-[#1A4D2E]/10 scale-[0.99]"
                  : "border-[#1A4D2E]/30 bg-[#FDFBF7] hover:border-[#1A4D2E] hover:bg-[#FDFBF7]/90"
              )}
            >
              <input
                ref={theoryInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddTheoryFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              <div className="mx-auto size-12 rounded-2xl bg-[#1A4D2E]/10 text-[#1A4D2E] flex items-center justify-center mb-3">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>

              <div className="flex items-center justify-center gap-2">
                <h4 className="font-serif text-xl text-[#2A2422] font-medium tracking-tight">
                  2. Theory Question OCR
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-paper border border-line text-muted text-[10px] font-semibold uppercase">
                  Worked Problems
                </span>
              </div>
              <p className="font-sans text-xs text-[#6B6B6B] mt-1 leading-relaxed max-w-xs mx-auto">
                Upload or snap theory-question pages. Gemini will extract the full theory questions and subparts, solve them, and generate clear model answers and explanations for teacher review.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface border border-line px-4 py-2 font-sans text-xs font-semibold text-ink hover:bg-paper transition-colors">
                Select Theory Photos
              </div>

              {/* Selected theory files list */}
              {theoryFiles.length > 0 && (
                <div className="mt-4 space-y-1.5 text-left border-t border-line/60 pt-3" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[11px] font-semibold text-muted uppercase">
                    Selected Theory Files ({theoryFiles.length})
                  </p>
                  <ul className="space-y-1">
                    {theoryFiles.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between text-xs bg-surface border border-line px-3 py-1.5 rounded-xl"
                      >
                        <span className="truncate font-medium text-ink max-w-[180px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTheoryFiles((prev) => prev.filter((_, k) => k !== i))}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
                    Ensure flat paper, good lighting, and clear question numbers for optimal extraction.
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

          {/* Primary Action Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              disabled={questionFiles.length === 0 && theoryFiles.length === 0}
              onClick={handleRunExtraction}
              className={cn(
                "px-8 py-3.5 rounded-full font-sans text-sm font-semibold transition-all shadow-xs flex items-center gap-2",
                questionFiles.length > 0 || theoryFiles.length > 0
                  ? "bg-[#1A4D2E] text-white hover:bg-[#153e25] scale-[1.01]"
                  : "bg-line/60 text-muted cursor-not-allowed"
              )}
            >
              <span>Extract & Solve Questions</span>
              {(questionFiles.length > 0 || theoryFiles.length > 0) && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                  {questionFiles.length + theoryFiles.length} file(s)
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
