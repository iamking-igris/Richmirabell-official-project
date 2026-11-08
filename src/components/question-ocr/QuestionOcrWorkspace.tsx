import React, { useState, useRef } from "react";
import type { Question, Choice } from "@/data/catalog";
import type {
  QuestionImportBatch,
  SourcePageItem,
  MatchedRecord,
  QuestionOption,
  ChoiceKey,
} from "@/types/question-import";
import {
  loadQuestionBatches,
  createNewBatch,
  updateBatch,
  deleteBatch,
  approveBatchToLibrary,
} from "@/lib/question-import-store";
import {
  extractQuestionsFromPage,
  extractAnswersFromPage,
} from "@/lib/question-ocr-service";
import { findSequenceGaps } from "@/lib/question-matcher";

export interface QuestionOcrWorkspaceProps {
  onImportToTopic?: (questions: Question[]) => void;
  topicTitle?: string;
}

export function QuestionOcrWorkspace({ onImportToTopic, topicTitle }: QuestionOcrWorkspaceProps = {}) {
  const [batches, setBatches] = useState<QuestionImportBatch[]>(() => loadQuestionBatches());
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => batches[0]?.id || "");
  const [currentStep, setCurrentStep] = useState<"batch" | "questions" | "answers" | "review" | "publish">("review");

  // Filter in review step
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  // New batch modal state
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [newBatchMeta, setNewBatchMeta] = useState({
    title: "",
    subject: "Physics",
    examType: "WAEC" as const,
    year: "2024",
    paperIdentifier: "Paper 1 (Objective)",
    description: "",
  });

  // Uploading / extracting state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputQRef = useRef<HTMLInputElement>(null);
  const fileInputARef = useRef<HTMLInputElement>(null);

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  function refreshBatches(updatedId?: string) {
    const fresh = loadQuestionBatches();
    setBatches(fresh);
    if (updatedId) setSelectedBatchId(updatedId);
  }

  function handleCreateBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = createNewBatch(newBatchMeta);
    refreshBatches(created.id);
    setIsCreatingBatch(false);
    setCurrentStep("questions");
    setNotification({ type: "success", text: `Batch "${created.title}" created successfully.` });
  }

  // Upload & process question sources
  async function handleQuestionFiles(files: FileList | null) {
    if (!files || files.length === 0 || !activeBatch) return;
    setIsProcessing(true);
    setNotification(null);

    const newSources: SourcePageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newSources.push({
        id: `qsrc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type || "image/jpeg",
        pageNumber: activeBatch.questionSources.length + i + 1,
        uploadedAt: new Date().toLocaleTimeString("en-NG"),
        extractionStatus: "pending",
      });
    }

    const updatedSources = [...activeBatch.questionSources, ...newSources];
    let allExtractedQ = [...activeBatch.extractedQuestions];

    // Process each newly added page with Gemini Questions OCR
    for (const src of newSources) {
      setProcessingMsg(`Extracting questions from ${src.fileName}...`);
      src.extractionStatus = "extracting";
      const res = await extractQuestionsFromPage(
        src.fileBase64,
        src.mimeType,
        src.fileName,
        activeBatch.id,
        src.id,
        src.pageNumber
      );

      if (res.ok) {
        src.extractionStatus = "extracted";
        allExtractedQ = [...allExtractedQ, ...res.questions];
      } else {
        src.extractionStatus = "error";
        src.errorMessage = res.message;
      }
    }

    const updated = updateBatch(activeBatch.id, {
      questionSources: updatedSources,
      extractedQuestions: allExtractedQ,
    });

    if (updated) refreshBatches(updated.id);
    setIsProcessing(false);
    setProcessingMsg("");
    setNotification({
      type: "success",
      text: `Processed ${newSources.length} question source page(s). Total questions: ${allExtractedQ.length}`,
    });
  }

  // Upload & process answer sources
  async function handleAnswerFiles(files: FileList | null) {
    if (!files || files.length === 0 || !activeBatch) return;
    setIsProcessing(true);
    setNotification(null);

    const newSources: SourcePageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newSources.push({
        id: `asrc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type || "image/jpeg",
        pageNumber: activeBatch.answerSources.length + i + 1,
        uploadedAt: new Date().toLocaleTimeString("en-NG"),
        extractionStatus: "pending",
      });
    }

    const updatedSources = [...activeBatch.answerSources, ...newSources];
    let allExtractedA = [...activeBatch.extractedAnswers];

    // Process each newly added page with Gemini Answers OCR
    for (const src of newSources) {
      setProcessingMsg(`Extracting answer keys from ${src.fileName}...`);
      src.extractionStatus = "extracting";
      const res = await extractAnswersFromPage(
        src.fileBase64,
        src.mimeType,
        src.fileName,
        activeBatch.id,
        src.id,
        src.pageNumber
      );

      if (res.ok) {
        src.extractionStatus = "extracted";
        allExtractedA = [...allExtractedA, ...res.answers];
      } else {
        src.extractionStatus = "error";
        src.errorMessage = res.message;
      }
    }

    const updated = updateBatch(activeBatch.id, {
      answerSources: updatedSources,
      extractedAnswers: allExtractedA,
    });

    if (updated) refreshBatches(updated.id);
    setIsProcessing(false);
    setProcessingMsg("");
    setNotification({
      type: "success",
      text: `Processed ${newSources.length} answer source page(s). Total answers: ${allExtractedA.length}`,
    });
  }

  // Delete question source and its extracted questions
  function removeQuestionSource(srcId: string) {
    if (!activeBatch) return;
    const remainingSources = activeBatch.questionSources.filter((s) => s.id !== srcId);
    const remainingQuestions = activeBatch.extractedQuestions.filter((q) => q.sourceFileId !== srcId);
    const updated = updateBatch(activeBatch.id, {
      questionSources: remainingSources,
      extractedQuestions: remainingQuestions,
    });
    if (updated) refreshBatches(updated.id);
  }

  // Delete answer source and its extracted answers
  function removeAnswerSource(srcId: string) {
    if (!activeBatch) return;
    const remainingSources = activeBatch.answerSources.filter((s) => s.id !== srcId);
    const remainingAnswers = activeBatch.extractedAnswers.filter((a) => a.sourceFileId !== srcId);
    const updated = updateBatch(activeBatch.id, {
      answerSources: remainingSources,
      extractedAnswers: remainingAnswers,
    });
    if (updated) refreshBatches(updated.id);
  }

  // Update a single matched record
  function updateRecord(recordId: string, patch: Partial<MatchedRecord>) {
    if (!activeBatch) return;
    const nextRecords = activeBatch.matchedRecords.map((r) =>
      r.id === recordId ? { ...r, ...patch } : r
    );
    const updated = updateBatch(activeBatch.id, { matchedRecords: nextRecords });
    if (updated) refreshBatches(updated.id);
  }

  // Publish / Approve
  function handleApproveBatch() {
    if (!activeBatch) return;
    const res = approveBatchToLibrary(activeBatch.id);
    refreshBatches(activeBatch.id);
    setNotification({
      type: "success",
      text: `Approved ${res.approvedCount} verified questions to library. Batch marked as Published.`,
    });
  }

  // Direct import into Topic Questions Collection
  function handleImportToTopicAction() {
    if (!activeBatch || !onImportToTopic) return;
    const recordsToImport = activeBatch.matchedRecords.filter(
      (r) => !r.isExcluded && r.question
    );
    if (recordsToImport.length === 0) {
      setNotification({
        type: "error",
        text: "No valid, non-excluded question records found to import.",
      });
      return;
    }

    const mappedQuestions: Question[] = recordsToImport.map((r, idx) => {
      const q = r.question!;
      const a = r.answer;
      const opts = (["A", "B", "C", "D"] as Choice[]).map((key) => {
        const found = q.options.find((o) => o.key === key);
        return { key, text: found ? found.text : "" };
      });

      const rawAns = a?.selectedOption?.toUpperCase() || "A";
      const validAns: Choice = (["A", "B", "C", "D"].includes(rawAns) ? rawAns : "A") as Choice;

      return {
        id: `ocr-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        prompt: q.prompt || "",
        options: opts,
        answer: validAns,
        explain: a?.explanation || "",
        answerKeyStatus: "shipped",
      };
    });

    onImportToTopic(mappedQuestions);
    setNotification({
      type: "success",
      text: `Successfully imported ${mappedQuestions.length} question(s) into Note Studio Questions collection!`,
    });
  }

  if (!activeBatch) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <h2 className="font-serif text-2xl text-ink">No Question Batches Available</h2>
        <button
          type="button"
          onClick={() => setIsCreatingBatch(true)}
          className="mt-4 px-5 py-2.5 rounded-full bg-primary text-primary-fg font-sans text-sm font-semibold"
        >
          + Create New Import Batch
        </button>
      </div>
    );
  }

  // Compute stats and sequence gaps for review step
  const questionNums = activeBatch.extractedQuestions.map((q) => q.questionNumber);
  const sequenceGaps = findSequenceGaps(questionNums);

  const matchedCount = activeBatch.matchedRecords.filter((r) => r.matchStatus === "matched" && !r.isExcluded).length;
  const needsReviewCount = activeBatch.matchedRecords.filter((r) => r.verificationStatus === "needs_review" && !r.isExcluded).length;
  const verifiedCount = activeBatch.matchedRecords.filter((r) => r.verificationStatus === "verified" && !r.isExcluded).length;
  const orphanCount = activeBatch.matchedRecords.filter((r) => r.matchStatus === "orphan_answer").length;
  const unmatchedQCount = activeBatch.matchedRecords.filter((r) => r.matchStatus === "unmatched_question").length;

  // Filter records
  const filteredRecords = activeBatch.matchedRecords.filter((r) => {
    if (reviewFilter === "matched") return r.matchStatus === "matched";
    if (reviewFilter === "needs_review") return r.verificationStatus === "needs_review";
    if (reviewFilter === "unmatched_q") return r.matchStatus === "unmatched_question";
    if (reviewFilter === "orphan_ans") return r.matchStatus === "orphan_answer";
    if (reviewFilter === "verified") return r.verificationStatus === "verified";
    if (reviewFilter === "excluded") return r.isExcluded;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Batch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              {activeBatch.examType} · {activeBatch.subject}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              activeBatch.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {activeBatch.status === "approved" ? "Published to Library" : "In Review"}
            </span>
          </div>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl text-ink tracking-tight">
            {activeBatch.title}
          </h1>
          <p className="mt-1 text-sm text-muted font-sans">
            {activeBatch.paperIdentifier} ({activeBatch.year}) · {activeBatch.matchedRecords.length} reconciled questions
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <select
            value={activeBatch.id}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-xs font-sans text-ink focus:border-primary outline-none"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.matchedRecords.length} Qs)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsCreatingBatch(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-fg font-sans text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span className="font-bold">+</span> New Batch
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {notification && (
        <div
          className={`rounded-2xl p-4 text-sm flex items-center justify-between gap-3 shadow-xs ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <p className="font-medium">{notification.text}</p>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Workflow Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {[
          { id: "batch", label: "1. Batch Info", count: null },
          { id: "questions", label: "2. Question Pages", count: activeBatch.questionSources.length },
          { id: "answers", label: "3. Answer Keys", count: activeBatch.answerSources.length },
          { id: "review", label: "4. Reconcile & Review", count: activeBatch.matchedRecords.length },
          { id: "publish", label: "5. Approve & Publish", count: verifiedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCurrentStep(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-sans font-semibold transition-all flex items-center gap-2 ${
              currentStep === tab.id
                ? "bg-ink text-primary-fg shadow-xs"
                : "bg-surface border border-line text-muted hover:text-ink hover:border-primary/40"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  currentStep === tab.id ? "bg-white/20 text-white" : "bg-line/60 text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* STEP 1: Batch Info */}
      {currentStep === "batch" && (
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-5">
          <h3 className="font-serif text-2xl text-ink font-medium">Batch Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Batch Title
              </label>
              <input
                type="text"
                value={activeBatch.title}
                onChange={(e) => updateBatch(activeBatch.id, { title: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Subject
              </label>
              <input
                type="text"
                value={activeBatch.subject}
                onChange={(e) => updateBatch(activeBatch.id, { subject: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Examination Body
              </label>
              <select
                value={activeBatch.examType}
                onChange={(e) => updateBatch(activeBatch.id, { examType: e.target.value as any })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink focus:border-primary outline-none"
              >
                <option value="WAEC">WAEC (WASSCE)</option>
                <option value="JAMB">JAMB (UTME)</option>
                <option value="NECO">NECO</option>
                <option value="School Exam">School Internal Exam</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Year / Session
              </label>
              <input
                type="text"
                value={activeBatch.year}
                onChange={(e) => updateBatch(activeBatch.id, { year: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Paper / Component Identifier
            </label>
            <input
              type="text"
              value={activeBatch.paperIdentifier}
              onChange={(e) => updateBatch(activeBatch.id, { paperIdentifier: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink focus:border-primary outline-none"
              placeholder="e.g. Paper 1 (Objective), Paper 2 (Theory), Section A"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={activeBatch.description || ""}
              onChange={(e) => updateBatch(activeBatch.id, { description: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2 text-sm font-sans text-ink focus:border-primary outline-none"
              placeholder="Source details, teacher notes, or physical booklet references..."
            />
          </div>
        </div>
      )}

      {/* STEP 2: Question Sources */}
      {currentStep === "questions" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-serif text-2xl text-ink font-medium">Question Paper Sources</h3>
                <p className="font-sans text-xs sm:text-sm text-muted mt-1">
                  Upload photographed question pages or scanned exam sheets. Gemini will transcribe printed question numbering and options.
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputQRef.current?.click()}
                className="px-5 py-2.5 rounded-full bg-primary text-primary-fg font-sans text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 self-start shrink-0 shadow-xs disabled:opacity-50"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {isProcessing ? "Processing OCR..." : "+ Upload Question Pages"}
              </button>
              <input
                ref={fileInputQRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleQuestionFiles(e.target.files)}
              />
            </div>

            {/* Uploaded question sources grid */}
            {activeBatch.questionSources.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-line bg-paper/50 p-10 text-center">
                <p className="font-serif text-lg text-ink">No question pages uploaded yet</p>
                <p className="font-sans text-xs text-muted mt-1 max-w-sm mx-auto">
                  Click the button above to upload photo(s) of question pages. Original question numbers and options will be parsed.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {activeBatch.questionSources.map((src) => {
                  const qCount = activeBatch.extractedQuestions.filter((q) => q.sourceFileId === src.id).length;
                  return (
                    <div key={src.id} className="rounded-2xl border border-line bg-paper p-4 relative group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-ink truncate max-w-[180px]">
                            {src.fileName}
                          </p>
                          <p className="text-[11px] text-muted">
                            Page {src.pageNumber} · {src.uploadedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestionSource(src.id)}
                          className="text-red-500 hover:text-red-700 text-xs p-1"
                          title="Remove source page"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          src.extractionStatus === "extracted"
                            ? "bg-emerald-100 text-emerald-800"
                            : src.extractionStatus === "extracting"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {src.extractionStatus === "extracted"
                            ? `${qCount} Question(s) Parsed`
                            : src.extractionStatus === "extracting"
                            ? "Extracting..."
                            : "Extraction Failed"}
                        </span>
                      </div>
                      {src.errorMessage && (
                        <p className="mt-2 text-[11px] text-red-600 bg-red-50 p-1.5 rounded-lg">
                          {src.errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Answer Sources */}
      {currentStep === "answers" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-serif text-2xl text-ink font-medium">Answer Key Sources</h3>
                <p className="font-sans text-xs sm:text-sm text-muted mt-1">
                  Upload photographed answer keys, teacher correction slips, or marking guides. Answers will be parsed independently and matched by original question number.
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputARef.current?.click()}
                className="px-5 py-2.5 rounded-full bg-primary text-primary-fg font-sans text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 self-start shrink-0 shadow-xs disabled:opacity-50"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {isProcessing ? "Processing OCR..." : "+ Upload Answer Key Pages"}
              </button>
              <input
                ref={fileInputARef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleAnswerFiles(e.target.files)}
              />
            </div>

            {/* Uploaded answer sources grid */}
            {activeBatch.answerSources.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-line bg-paper/50 p-10 text-center">
                <p className="font-serif text-lg text-ink">No answer key pages uploaded yet</p>
                <p className="font-sans text-xs text-muted mt-1 max-w-sm mx-auto">
                  Upload photos of answer keys or solutions. They will be reconciled with the corresponding question numbers.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {activeBatch.answerSources.map((src) => {
                  const aCount = activeBatch.extractedAnswers.filter((a) => a.sourceFileId === src.id).length;
                  return (
                    <div key={src.id} className="rounded-2xl border border-line bg-paper p-4 relative group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-ink truncate max-w-[180px]">
                            {src.fileName}
                          </p>
                          <p className="text-[11px] text-muted">
                            Page {src.pageNumber} · {src.uploadedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAnswerSource(src.id)}
                          className="text-red-500 hover:text-red-700 text-xs p-1"
                          title="Remove answer page"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          src.extractionStatus === "extracted"
                            ? "bg-emerald-100 text-emerald-800"
                            : src.extractionStatus === "extracting"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {src.extractionStatus === "extracted"
                            ? `${aCount} Answer Key(s) Parsed`
                            : src.extractionStatus === "extracting"
                            ? "Extracting..."
                            : "Extraction Failed"}
                        </span>
                      </div>
                      {src.errorMessage && (
                        <p className="mt-2 text-[11px] text-red-600 bg-red-50 p-1.5 rounded-lg">
                          {src.errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Matching & Review Interface */}
      {currentStep === "review" && (
        <div className="space-y-6">
          {/* Sequence Gap Notification */}
          {sequenceGaps.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3 text-sm text-amber-900 shadow-2xs">
              <span className="size-5 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                !
              </span>
              <div>
                <p className="font-semibold">Numbering sequence gap detected</p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Missing question number(s) in source pages: Question {sequenceGaps.join(", ")}. Original numbering has been preserved without shifting other questions.
                </p>
              </div>
            </div>
          )}

          {/* Reconciliation Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Matched</p>
              <p className="font-serif text-2xl text-emerald-700 mt-1">{matchedCount}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Needs Review</p>
              <p className="font-serif text-2xl text-amber-700 mt-1">{needsReviewCount}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Unmatched Qs</p>
              <p className="font-serif text-2xl text-rose-700 mt-1">{unmatchedQCount}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Orphan Answers</p>
              <p className="font-serif text-2xl text-purple-700 mt-1">{orphanCount}</p>
            </div>
          </div>

          {/* Sub-Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-line">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: "all", label: "All Records", count: activeBatch.matchedRecords.length },
                { id: "matched", label: "Matched", count: matchedCount },
                { id: "needs_review", label: "Needs Review", count: needsReviewCount },
                { id: "unmatched_q", label: "Missing Answer", count: unmatchedQCount },
                { id: "orphan_ans", label: "Orphan Answer", count: orphanCount },
                { id: "verified", label: "Verified", count: verifiedCount },
                { id: "excluded", label: "Excluded", count: activeBatch.matchedRecords.filter((r) => r.isExcluded).length },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReviewFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                    reviewFilter === f.id
                      ? "bg-primary text-primary-fg"
                      : "bg-paper text-muted hover:text-ink hover:bg-line/40"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            <span className="text-xs text-muted font-sans px-2">
              Showing {filteredRecords.length} records
            </span>
          </div>

          {/* Records List */}
          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-8 text-center text-sm text-muted">
                No question records match the selected filter.
              </div>
            ) : (
              filteredRecords.map((record) => (
                <QuestionReviewCard
                  key={record.id}
                  record={record}
                  isActive={activeRecordId === record.id}
                  onToggleActive={() =>
                    setActiveRecordId(activeRecordId === record.id ? null : record.id)
                  }
                  onUpdate={(patch) => updateRecord(record.id, patch)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* STEP 5: Approve & Publish */}
      {currentStep === "publish" && (
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <h3 className="font-serif text-2xl text-ink font-medium">Approve and Commit Batch</h3>
          <p className="font-sans text-sm text-muted">
            Committing this batch saves verified questions into the Richmirabel question bank. Excluded or unverified records remain held in draft.
          </p>

          <div className="rounded-2xl border border-line bg-paper p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">Total Reconciled Records:</span>
              <span className="font-bold">{activeBatch.matchedRecords.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-emerald-800">Verified by Teacher:</span>
              <span className="font-bold text-emerald-800">{verifiedCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-amber-800">Still Awaiting Review:</span>
              <span className="font-bold text-amber-800">{needsReviewCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted">Excluded from Release:</span>
              <span className="font-bold text-muted">
                {activeBatch.matchedRecords.filter((r) => r.isExcluded).length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onImportToTopic && (
              <button
                type="button"
                onClick={handleImportToTopicAction}
                className="px-6 py-3 rounded-full bg-[#1A4D2E] text-white font-sans text-sm font-semibold hover:bg-[#153e25] transition-all shadow-xs"
              >
                📥 Import {activeBatch.matchedRecords.filter((r) => !r.isExcluded && r.question).length} Questions into {topicTitle || "Topic"} Questions Tab
              </button>
            )}
            <button
              type="button"
              onClick={handleApproveBatch}
              disabled={verifiedCount === 0}
              className="px-6 py-3 rounded-full bg-primary text-primary-fg font-sans text-sm font-semibold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
            >
              Approve {verifiedCount} Verified Questions to Library
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("review")}
              className="px-5 py-3 rounded-full border border-line bg-paper text-ink font-sans text-sm font-medium hover:bg-line/40 transition-colors"
            >
              Back to Review
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create New Batch */}
      {isCreatingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-ink font-medium">New Question Batch</h3>
              <button
                type="button"
                onClick={() => setIsCreatingBatch(false)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Batch Title
                </label>
                <input
                  required
                  type="text"
                  value={newBatchMeta.title}
                  onChange={(e) => setNewBatchMeta({ ...newBatchMeta, title: e.target.value })}
                  placeholder="e.g. WAEC 2024 Physics Paper 1"
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <select
                    value={newBatchMeta.subject}
                    onChange={(e) => setNewBatchMeta({ ...newBatchMeta, subject: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-sans text-ink focus:border-primary outline-none"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Exam Type
                  </label>
                  <select
                    value={newBatchMeta.examType}
                    onChange={(e) => setNewBatchMeta({ ...newBatchMeta, examType: e.target.value as any })}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-sans text-ink focus:border-primary outline-none"
                  >
                    <option value="WAEC">WAEC</option>
                    <option value="JAMB">JAMB</option>
                    <option value="NECO">NECO</option>
                    <option value="School Exam">School Exam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Year / Session
                  </label>
                  <input
                    type="text"
                    value={newBatchMeta.year}
                    onChange={(e) => setNewBatchMeta({ ...newBatchMeta, year: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-sans text-ink focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Paper ID
                  </label>
                  <input
                    type="text"
                    value={newBatchMeta.paperIdentifier}
                    onChange={(e) => setNewBatchMeta({ ...newBatchMeta, paperIdentifier: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-sans text-ink focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingBatch(false)}
                  className="px-4 py-2 rounded-xl text-xs font-sans text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-fg font-sans text-xs font-semibold hover:bg-primary/90"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Question + Matched Answer Review Card
function QuestionReviewCard({
  record,
  isActive,
  onToggleActive,
  onUpdate,
}: {
  record: MatchedRecord;
  isActive: boolean;
  onToggleActive: () => void;
  onUpdate: (patch: Partial<MatchedRecord>) => void;
}) {
  const isTheory = record.type === "theory";
  const q = record.question;
  const a = record.answer;

  const statusBadges = {
    matched: "bg-emerald-100 text-emerald-800 border-emerald-200",
    unmatched_question: "bg-rose-100 text-rose-800 border-rose-200",
    orphan_answer: "bg-purple-100 text-purple-800 border-purple-200",
    duplicate_question: "bg-amber-100 text-amber-800 border-amber-200",
    duplicate_answer: "bg-amber-100 text-amber-800 border-amber-200",
    ambiguous: "bg-red-100 text-red-800 border-red-200",
  };

  const statusLabels = {
    matched: "Matched with Key",
    unmatched_question: "Missing Answer",
    orphan_answer: "Orphan Answer Key",
    duplicate_question: "Duplicate Question Number",
    duplicate_answer: "Conflicting Keys",
    ambiguous: "Ambiguous Match",
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        record.isExcluded
          ? "border-line/60 bg-paper/50 opacity-60"
          : record.verificationStatus === "verified"
          ? "border-emerald-200 bg-surface shadow-xs"
          : "border-line bg-surface shadow-xs"
      }`}
    >
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-line/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-serif text-lg font-bold text-ink">
            Question {record.originalNumber}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusBadges[record.matchStatus] || "bg-line text-muted"
            }`}
          >
            {statusLabels[record.matchStatus] || record.matchStatus}
          </span>
          {record.verificationStatus === "verified" && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              ✓ Verified
            </span>
          )}
          {record.isExcluded && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200 text-neutral-700">
              Excluded
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Verify button */}
          <button
            type="button"
            onClick={() =>
              onUpdate({
                verificationStatus:
                  record.verificationStatus === "verified" ? "needs_review" : "verified",
              })
            }
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              record.verificationStatus === "verified"
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "border border-line bg-paper text-ink hover:border-primary/50"
            }`}
          >
            {record.verificationStatus === "verified" ? "✓ Verified" : "Mark Verified"}
          </button>

          {/* Exclude / Include button */}
          <button
            type="button"
            onClick={() => onUpdate({ isExcluded: !record.isExcluded })}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted hover:text-ink hover:bg-line/40 transition-colors"
          >
            {record.isExcluded ? "Restore" : "Exclude"}
          </button>

          {/* Toggle inline edit */}
          <button
            type="button"
            onClick={onToggleActive}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            {isActive ? "Close Editor" : "Edit Question / Answer"}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-4">
        {/* Match Notes / Warning if present */}
        {record.matchNotes && (
          <div className="text-xs text-muted bg-paper p-2.5 rounded-xl border border-line/60">
            {record.matchNotes}
          </div>
        )}

        {/* Question Details */}
        {q ? (
          <div className="space-y-3">
            <p className="font-medium text-ink text-base leading-relaxed">
              {q.prompt}
            </p>

            {/* Multiple Choice Options */}
            {!isTheory && q.options && q.options.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt) => {
                  const isCorrect = a?.selectedOption === opt.key;
                  return (
                    <div
                      key={opt.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-sm transition-colors ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 font-medium"
                          : "border-line bg-paper text-ink"
                      }`}
                    >
                      <span
                        className={`size-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCorrect ? "bg-emerald-600 text-white" : "bg-line/60 text-muted"
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="leading-snug pt-0.5">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-paper/60 p-4 text-xs text-muted italic">
            Original question text absent from question source pages (Orphan Answer record).
          </div>
        )}

        {/* Matched Answer & Explanation Section */}
        {a ? (
          <div className="rounded-xl border border-emerald-200 bg-[#F4F8F5] p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-600" />
                Correct Answer Key: <strong className="text-sm font-bold">{a.selectedOption || "Answer Provided"}</strong>
                {a.answerText && <span> · {a.answerText}</span>}
              </span>
              <span className="text-[11px] text-emerald-700/70">
                Source: {a.sourceFileName}
              </span>
            </div>

            {a.explanation && (
              <div className="text-xs text-ink/80 pt-1 leading-relaxed border-t border-emerald-100">
                <strong>Explanation / Working:</strong> {a.explanation}
              </div>
            )}

            {isTheory && a.modelAnswer && (
              <div className="text-xs text-ink/80 pt-1 leading-relaxed border-t border-emerald-100">
                <strong>Model Answer:</strong> {a.modelAnswer}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            ⚠️ No answer key was found on the answer pages for Question {record.originalNumber}. Click "Edit Question / Answer" to supply one manually.
          </div>
        )}

        {/* Source References */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1">
          {q && (
            <span>
              📄 Question Source: <strong className="text-ink">{q.sourceFileName}</strong>
            </span>
          )}
          {a && (
            <span>
              🔑 Answer Source: <strong className="text-ink">{a.sourceFileName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Inline Editing Drawer */}
      {isActive && (
        <div className="border-t border-line bg-paper p-5 rounded-b-2xl space-y-4">
          <h4 className="font-serif text-sm font-bold text-ink">Manual Record Correction</h4>

          {/* Edit Prompt */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Question Prompt
            </label>
            <textarea
              rows={2}
              value={q?.prompt || ""}
              onChange={(e) => {
                if (!q) return;
                onUpdate({
                  question: { ...q, prompt: e.target.value },
                });
              }}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-sans text-ink focus:border-primary outline-none"
            />
          </div>

          {/* Edit Options if multiple choice */}
          {!isTheory && q && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Options
              </label>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, idx) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-line font-bold text-xs flex items-center justify-center shrink-0">
                      {opt.key}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const nextOpts = [...q.options];
                        nextOpts[idx] = { ...opt, text: e.target.value };
                        onUpdate({
                          question: { ...q, options: nextOpts },
                        });
                      }}
                      className="w-full rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-sans text-ink outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Answer Key and Explanation */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Correct Option Letter
              </label>
              <input
                type="text"
                value={a?.selectedOption || ""}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  const nextAns = a
                    ? { ...a, selectedOption: val }
                    : {
                        id: `manual-ans-${Date.now()}`,
                        batchId: record.batchId,
                        sourceFileId: "manual",
                        sourceFileName: "Teacher manual entry",
                        questionNumber: record.originalNumber,
                        type: record.type,
                        selectedOption: val,
                      };
                  onUpdate({
                    answer: nextAns,
                    matchStatus: "matched",
                  });
                }}
                placeholder="A, B, C, or D"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-mono text-ink outline-none uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Explanation / Solution
              </label>
              <input
                type="text"
                value={a?.explanation || ""}
                onChange={(e) => {
                  if (!a) return;
                  onUpdate({
                    answer: { ...a, explanation: e.target.value },
                  });
                }}
                placeholder="Educational rationale or worked solution..."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-sans text-ink outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onToggleActive}
              className="px-4 py-2 rounded-xl bg-primary text-primary-fg text-xs font-semibold hover:bg-primary/90"
            >
              Done Editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Convert File to Base64 helper
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
