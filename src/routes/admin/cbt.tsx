import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Calendar,
  Layers,
  Trophy,
  ChevronRight,
  Eye,
  BookOpen,
  X,
  Save,
  Check,
  RefreshCw,
  Send,
  HelpCircle,
  FileText,
  ClipboardList,
  History,
  ShieldCheck,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import {
  useCbtStore,
  JAMB_SUBJECT_LABELS,
  JAMB_SUBJECT_ROLES,
  JAMB_SECTION_TARGETS,
  type JambSectionSubject,
  type AdminJambExam,
  type QuestionBankItem,
  validateWeeklyExam,
  type ValidationError,
  formatLagosDateTime,
  getExamLifecycleState,
  parsePastedQuestionBlock,
  getCurrentLiveExam,
  getNextScheduledExam,
  getPreviousExamHistory,
  getNextWeekNumber,
  calculateDefaultNextWeekSchedule,
} from "@/lib/cbt-store";
import {
  auditExaminationUniqueness,
  type ExamAuditReport,
} from "@/lib/question-uniqueness";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/cbt")({ component: AdminJambCbtStudio });

const ALL_JAMB_SECTIONS: JambSectionSubject[] = [
  "english",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
];

export function AdminJambCbtStudio() {
  const adminExams = useCbtStore((s) => s.adminExams);
  const createWeeklyJambExam = useCbtStore((s) => s.createWeeklyJambExam);
  const createNextWeekExam = useCbtStore((s) => s.createNextWeekExam);
  const scheduleAdminExam = useCbtStore((s) => s.scheduleAdminExam);
  const cancelScheduledExam = useCbtStore((s) => s.cancelScheduledExam);
  const createFullJambMock = useCbtStore((s) => s.createFullJambMock);
  const updateAdminExam = useCbtStore((s) => s.updateAdminExam);
  const deleteAdminExam = useCbtStore((s) => s.deleteAdminExam);
  const publishAdminExam = useCbtStore((s) => s.publishAdminExam);
  const markExamAvailable = useCbtStore((s) => s.markExamAvailable);
  const populateTemplateQuestions = useCbtStore((s) => s.populateTemplateQuestions);
  const addQuestionToSection = useCbtStore((s) => s.addQuestionToSection);
  const bulkAddQuestionsToSection = useCbtStore((s) => s.bulkAddQuestionsToSection);
  const updateQuestionInSection = useCbtStore((s) => s.updateQuestionInSection);
  const deleteQuestionFromSection = useCbtStore((s) => s.deleteQuestionFromSection);
  const duplicateQuestionInSection = useCbtStore((s) => s.duplicateQuestionInSection);

  // Studio View State: "library" | "editor" | "mock_editor"
  const [view, setView] = useState<"library" | "editor" | "mock_editor">("library");
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<JambSectionSubject>("english");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "weekly_jamb" | "full_jamb_mock" | "drafts" | "upcoming" | "history">("all");

  // Save feedback state
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Active exam object
  const activeExam = useMemo(() => {
    return adminExams.find((e) => e.id === activeExamId) || null;
  }, [adminExams, activeExamId]);

  // Derived Examination Lifecycle Groups
  const currentLiveExam = useMemo(() => getCurrentLiveExam(adminExams), [adminExams]);
  const nextScheduledExam = useMemo(() => getNextScheduledExam(adminExams), [adminExams]);
  const examHistory = useMemo(() => getPreviousExamHistory(adminExams), [adminExams]);
  const nextWeekNum = useMemo(() => getNextWeekNumber(adminExams), [adminExams]);

  const liveLifecycle = currentLiveExam
    ? getExamLifecycleState(currentLiveExam.startAt, currentLiveExam.endAt, currentLiveExam.status)
    : null;

  // Countdown timer for next scheduled exam
  const [scheduledCountdown, setScheduledCountdown] = useState<string>("");

  useEffect(() => {
    const targetExam = nextScheduledExam || (currentLiveExam && liveLifecycle === "coming_soon" ? currentLiveExam : null);
    if (!targetExam) {
      setScheduledCountdown("");
      return;
    }

    const tick = () => {
      const now = Date.now();
      const startMs = new Date(targetExam.startAt).getTime();
      const diffSec = Math.max(0, Math.floor((startMs - now) / 1000));

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      if (diffSec <= 0) {
        setScheduledCountdown("Release Window Active");
      } else if (days > 0) {
        setScheduledCountdown(`${days}d ${hours}h ${mins}m`);
      } else {
        setScheduledCountdown(`${hours}h ${mins}m ${secs}s`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextScheduledExam, currentLiveExam, liveLifecycle]);

  // Modal States
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [questionFormPrompt, setQuestionFormPrompt] = useState("");
  const [questionFormTopic, setQuestionFormTopic] = useState("");
  const [questionFormOptions, setQuestionFormOptions] = useState<[string, string, string, string]>([
    "",
    "",
    "",
    "",
  ]);
  const [questionFormAnswer, setQuestionFormAnswer] = useState<"A" | "B" | "C" | "D">("A");
  const [questionFormExplanation, setQuestionFormExplanation] = useState("");
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);

  // Paste Question Block Modal State
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState("");
  const [parsedPastedItems, setParsedPastedItems] = useState<Omit<QuestionBankItem, "id" | "createdAt" | "status">[]>([]);

  // Gemini Generator Modal State
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(40);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [genDifficulty, setGenDifficulty] = useState<string>("JAMB UTME Standard");
  const [genLoading, setGenLoading] = useState(false);
  const [genStatusText, setGenStatusText] = useState<string>("");
  const [genError, setGenError] = useState<string | null>(null);
  const [stagedQuestions, setStagedQuestions] = useState<
    (Omit<QuestionBankItem, "id" | "createdAt" | "status"> & {
      selected: boolean;
    })[]
  >([]);

  // Validation / Review Modal State
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Delete Confirmation Modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "exam" | "question";
    examId: string;
    section?: JambSectionSubject;
    questionId?: string;
    name: string;
  } | null>(null);

  // Scheduling Dialog State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedulingExam, setSchedulingExam] = useState<AdminJambExam | null>(null);
  const [schedStartInput, setSchedStartInput] = useState("");
  const [schedEndInput, setSchedEndInput] = useState("");
  const [schedError, setSchedError] = useState<string | null>(null);

  function handleOpenScheduleModal(exam: AdminJambExam) {
    setSchedulingExam(exam);
    const toLocalInput = (iso: string) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setSchedStartInput(toLocalInput(exam.startAt));
    setSchedEndInput(toLocalInput(exam.endAt));
    setSchedError(null);
    setScheduleModalOpen(true);
  }

  function handleSaveSchedule(asStatus: "draft" | "scheduled" | "published" = "scheduled") {
    if (!schedulingExam) return;
    const startMs = new Date(schedStartInput).getTime();
    const endMs = new Date(schedEndInput).getTime();
    if (isNaN(startMs) || isNaN(endMs)) {
      setSchedError("Please provide valid start and end dates/times.");
      return;
    }
    if (endMs <= startMs) {
      setSchedError("Closing date/time must be strictly after release date/time.");
      return;
    }
    const isoStart = new Date(schedStartInput).toISOString();
    const isoEnd = new Date(schedEndInput).toISOString();

    if (asStatus === "scheduled" || asStatus === "published") {
      const errs = validateWeeklyExam({ ...schedulingExam, startAt: isoStart, endAt: isoEnd });
      const critical = errs.filter((e) => !e.message.includes("(Recommended:"));
      if (critical.length > 0) {
        setValidationErrors(critical);
        setValidationModalOpen(true);
        return;
      }
    }

    scheduleAdminExam(schedulingExam.id, isoStart, isoEnd, asStatus === "draft" ? false : true);
    notifySaved(asStatus === "draft" ? "Schedule saved as draft." : "Examination scheduled & published!");
    setScheduleModalOpen(false);
  }

  function handleCancelSchedule() {
    if (!schedulingExam) return;
    cancelScheduledExam(schedulingExam.id);
    notifySaved("Scheduled release cancelled. Reverted to draft.");
    setScheduleModalOpen(false);
  }

  // Uniqueness Audit Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditExam, setAuditExam] = useState<AdminJambExam | null>(null);
  const [auditReport, setAuditReport] = useState<ExamAuditReport | null>(null);

  function handleRunAudit(exam: AdminJambExam) {
    setAuditExam(exam);
    const report = auditExaminationUniqueness(exam, adminExams);
    setAuditReport(report);
    setAuditModalOpen(true);
  }

  // Helper to trigger save feedback
  function notifySaved(message: string = "Changes saved to device.") {
    setSaveBanner(message);
    setTimeout(() => setSaveBanner(null), 3000);
  }

  // Handle "Set This Week's Exam" Action
  function handleSetThisWeeksExam() {
    if (currentLiveExam) {
      setActiveExamId(currentLiveExam.id);
      setActiveSection("english");
      setView("editor");
    } else {
      const newId = createWeeklyJambExam();
      setActiveExamId(newId);
      setActiveSection("english");
      setView("editor");
    }
  }

  // Handle "Create Next Week's Exam (Advance Preparation)"
  function handleCreateNextWeekExam() {
    const newId = createNextWeekExam();
    setActiveExamId(newId);
    setActiveSection("english");
    setView("editor");
    notifySaved(`Week ${nextWeekNum} paper created for advance preparation! Current live exam remains active.`);
  }

  // Handle open question editor
  function handleOpenQuestionModal(existing?: QuestionBankItem) {
    if (existing) {
      setEditingQuestion(existing);
      setQuestionFormPrompt(existing.prompt);
      setQuestionFormTopic(existing.topic || "");
      const opts = existing.options || [];
      setQuestionFormOptions([
        opts.find((o) => o.key === "A")?.text || "",
        opts.find((o) => o.key === "B")?.text || "",
        opts.find((o) => o.key === "C")?.text || "",
        opts.find((o) => o.key === "D")?.text || "",
      ]);
      setQuestionFormAnswer((existing.answer as any) || "A");
      setQuestionFormExplanation(existing.explanation || "");
    } else {
      setEditingQuestion(null);
      setQuestionFormPrompt("");
      setQuestionFormTopic(activeSection ? `${JAMB_SUBJECT_LABELS[activeSection]} Core Topic` : "");
      setQuestionFormOptions(["", "", "", ""]);
      setQuestionFormAnswer("A");
      setQuestionFormExplanation("");
    }
    setQuestionFormError(null);
    setQuestionModalOpen(true);
  }

  // Handle save question from modal
  function handleSaveQuestion() {
    if (!questionFormPrompt.trim()) {
      setQuestionFormError("Question prompt cannot be empty.");
      return;
    }
    if (questionFormOptions.some((opt) => !opt.trim())) {
      setQuestionFormError("All four options (A, B, C, D) must be provided.");
      return;
    }
    if (!activeExamId) return;

    const payload = {
      subject: JAMB_SUBJECT_LABELS[activeSection],
      topic: questionFormTopic.trim() || undefined,
      type: "multiple_choice" as const,
      prompt: questionFormPrompt.trim(),
      options: [
        { key: "A" as const, text: questionFormOptions[0].trim() },
        { key: "B" as const, text: questionFormOptions[1].trim() },
        { key: "C" as const, text: questionFormOptions[2].trim() },
        { key: "D" as const, text: questionFormOptions[3].trim() },
      ],
      answer: questionFormAnswer,
      explanation: questionFormExplanation.trim() || undefined,
    };

    if (editingQuestion) {
      updateQuestionInSection(activeExamId, activeSection, editingQuestion.id, payload);
      notifySaved("Question updated.");
    } else {
      addQuestionToSection(activeExamId, activeSection, payload);
      notifySaved("New question added to section.");
    }

    setQuestionModalOpen(false);
  }

  // Handle Parse Pasted Text
  function handleParsePastedText() {
    if (!pasteRawText.trim()) return;
    const parsed = parsePastedQuestionBlock(pasteRawText, JAMB_SUBJECT_LABELS[activeSection]);
    setParsedPastedItems(parsed);
  }

  // Handle Accept Pasted Questions
  function handleAcceptPastedQuestions() {
    if (!activeExamId || parsedPastedItems.length === 0) return;
    bulkAddQuestionsToSection(activeExamId, activeSection, parsedPastedItems);
    notifySaved(`Added ${parsedPastedItems.length} questions to ${JAMB_SUBJECT_LABELS[activeSection]}.`);
    setPasteModalOpen(false);
    setPasteRawText("");
    setParsedPastedItems([]);
  }

  // Handle generate questions with Gemini (Supports target count, batching & sample history)
  async function handleExecuteGeminiGeneration() {
    setGenLoading(true);
    setGenError(null);
    setStagedQuestions([]);
    setGenStatusText("Preparing question generation pipeline...");

    try {
      const currentSavedCount = activeExam?.sections[activeSection]?.length || 0;
      const remainingCount = Math.max(0, targetQuestionCount - currentSavedCount);
      const totalToGenerate = remainingCount > 0 ? remainingCount : Math.max(1, targetQuestionCount);
      const effectiveBatchSize = Math.max(1, Math.min(20, batchSize));

      // Collect sample history (up to 15 recent questions from the active section)
      // to provide context for fresh question phrasing without hard duplicate exclusions
      const existingSectionQuestions = activeExam?.sections[activeSection] || [];
      const sampleHistory = existingSectionQuestions.slice(-15).map((q) => q.prompt);

      const accumulated: (Omit<QuestionBankItem, "id" | "createdAt" | "status"> & {
        selected: boolean;
      })[] = [];
      let generatedSoFar = 0;

      while (generatedSoFar < totalToGenerate) {
        const batchCount = Math.min(effectiveBatchSize, totalToGenerate - generatedSoFar);
        const batchNumber = Math.floor(generatedSoFar / effectiveBatchSize) + 1;
        const totalBatches = Math.ceil(totalToGenerate / effectiveBatchSize);

        setGenStatusText(
          `Generating diverse batch ${batchNumber} of ${totalBatches} (${accumulated.length}/${totalToGenerate} questions ready)...`
        );

        const res = await fetch("/api/admin/generate-cbt-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: JAMB_SUBJECT_LABELS[activeSection],
            topic: genTopic.trim() || `${JAMB_SUBJECT_LABELS[activeSection]} Syllabus`,
            count: batchCount,
            difficulty: genDifficulty,
            sampleHistory,
            batchNonce: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          }),
        });

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
          if (accumulated.length > 0) break;
          throw new Error(data.message || "Failed to generate questions batch.");
        }

        for (const q of data.questions) {
          accumulated.push({
            subject: JAMB_SUBJECT_LABELS[activeSection],
            topic: q.topic || genTopic || JAMB_SUBJECT_LABELS[activeSection],
            type: "multiple_choice" as const,
            prompt: q.prompt,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            selected: true, // All valid questions selected by default for administrator review
          });
        }

        generatedSoFar += data.questions.length;
      }

      setStagedQuestions(accumulated);
    } catch (err: any) {
      setGenError(err.message || "Generation request failed.");
    } finally {
      setGenLoading(false);
      setGenStatusText("");
    }
  }

  // Accept staged generated questions into section
  function handleAcceptStagedQuestions() {
    if (!activeExamId) return;
    const selected = stagedQuestions.filter((q) => q.selected);
    if (selected.length === 0) return;

    for (const q of selected) {
      addQuestionToSection(activeExamId, activeSection, {
        subject: q.subject,
        topic: q.topic,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      });
    }

    notifySaved(`Added ${selected.length} AI-generated questions to ${JAMB_SUBJECT_LABELS[activeSection]}.`);
    setGeminiModalOpen(false);
    setStagedQuestions([]);
  }

  // Handle publish action
  function handlePublishCurrentExam() {
    if (!activeExam) return;
    const errors = validateWeeklyExam(activeExam);
    const criticalErrors = errors.filter((e) => !e.message.includes("(Recommended:"));
    if (criticalErrors.length > 0) {
      setValidationErrors(criticalErrors);
      setValidationModalOpen(true);
      return;
    }

    const res = publishAdminExam(activeExam.id);
    if (res.success) {
      notifySaved("Examination successfully published! It is now live in the student Weekly CBT schedule.");
    } else {
      setValidationErrors(res.errors);
      setValidationModalOpen(true);
    }
  }

  // Handle immediate activation (Available Now)
  function handleMarkAvailableNow(examId?: string) {
    const targetId = examId || activeExam?.id;
    if (!targetId) return;
    markExamAvailable(targetId);
    notifySaved("Examination marked AVAILABLE NOW for all candidates!");
  }

  // Filtered exams for library table
  const filteredExams = useMemo(() => {
    return adminExams.filter((e) => {
      if (libraryFilter === "all") return true;
      if (libraryFilter === "weekly_jamb") return e.type === "weekly_jamb";
      if (libraryFilter === "full_jamb_mock") return e.type === "full_jamb_mock";
      if (libraryFilter === "drafts") return e.status === "draft";
      if (libraryFilter === "upcoming") {
        const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
        return state === "coming_soon" || state === "open";
      }
      if (libraryFilter === "history") {
        const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
        return state === "closed" || e.status === "archived";
      }
      return true;
    });
  }, [adminExams, libraryFilter]);

  // Modal Render Helpers
  function renderQuestionModal() {
    if (!questionModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-stone-900">
                {editingQuestion ? "Edit Question" : "Add New Question"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-[#1A4D2E] text-xs font-bold">
                {JAMB_SUBJECT_LABELS[activeSection]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQuestionModalOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          {questionFormError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0 text-rose-600" />
              <span>{questionFormError}</span>
            </div>
          )}

          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="font-bold text-stone-700 uppercase text-[10px] block">
                Question Prompt (Supports LaTeX math like \frac{"{a}{b}"}, v = f\lambda)
              </label>
              <textarea
                rows={3}
                value={questionFormPrompt}
                onChange={(e) => setQuestionFormPrompt(e.target.value)}
                placeholder="Enter the examination question text..."
                className="mt-1 w-full rounded-2xl border border-stone-200 p-3 text-xs font-medium focus:border-[#1A4D2E] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 uppercase text-[10px] block">
                Topic / Subtopic
              </label>
              <input
                type="text"
                value={questionFormTopic}
                onChange={(e) => setQuestionFormTopic(e.target.value)}
                placeholder="e.g. Current Electricity or Mechanics"
                className="mt-1 w-full rounded-xl border border-stone-200 p-2.5 text-xs font-medium"
              />
            </div>

            {/* Options A-D with Radio for Correct Answer */}
            <div className="space-y-2 pt-1">
              <label className="font-bold text-stone-700 uppercase text-[10px] block">
                Answer Options & Correct Answer Selection
              </label>

              {(["A", "B", "C", "D"] as const).map((key, i) => (
                <div key={key} className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={questionFormAnswer === key}
                      onChange={() => setQuestionFormAnswer(key)}
                      className="accent-[#1A4D2E] size-4"
                    />
                    <span className="font-bold text-xs text-stone-800">Option {key}</span>
                  </label>
                  <input
                    type="text"
                    value={questionFormOptions[i]}
                    onChange={(e) => {
                      const copy = [...questionFormOptions] as [string, string, string, string];
                      copy[i] = e.target.value;
                      setQuestionFormOptions(copy);
                    }}
                    placeholder={`Enter text for option ${key}`}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-xs font-medium",
                      questionFormAnswer === key
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-stone-200"
                    )}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="font-bold text-stone-700 uppercase text-[10px] block">
                Tutor Explanation / Step-by-Step Working
              </label>
              <textarea
                rows={2}
                value={questionFormExplanation}
                onChange={(e) => setQuestionFormExplanation(e.target.value)}
                placeholder="Explain formula, substitution, or core concept..."
                className="mt-1 w-full rounded-2xl border border-stone-200 p-2.5 text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setQuestionModalOpen(false)}
              className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveQuestion}
              className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
            >
              {editingQuestion ? "Update Question" : "Save Question"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPasteModal() {
    if (!pasteModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8 font-sans">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-[#1A4D2E]" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Paste Question Block ({JAMB_SUBJECT_LABELS[activeSection]})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPasteModalOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-stone-600 leading-relaxed font-sans">
              Paste raw plain text questions with options A–D and Answer keys (e.g. <code>1. Question prompt A. ... B. ... C. ... D. ... Answer: B</code>).
            </p>

            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder={`1. Which cellular organelle synthesizes ATP during respiration?\nA. Mitochondrion\nB. Ribosome\nC. Golgi apparatus\nD. Vacuole\nAnswer: A\nExplanation: Mitochondria generate ATP via oxidative phosphorylation.`}
              className="w-full rounded-2xl border border-stone-200 p-3 text-xs font-mono focus:border-[#1A4D2E] focus:outline-hidden"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-4 py-2 rounded-full border border-stone-300 bg-stone-50 text-stone-800 text-xs font-bold hover:bg-stone-100"
              >
                Parse Questions ({parsedPastedItems.length} Detected)
              </button>
            </div>

            {parsedPastedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <span className="font-bold text-stone-800 block text-xs">
                  Parsed Preview ({parsedPastedItems.length} questions ready to add):
                </span>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {parsedPastedItems.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-1 text-xs">
                      <div className="font-bold text-stone-900 flex justify-between">
                        <span>Q#{idx + 1}: {item.prompt}</span>
                        <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">Key: {item.answer}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-600 pt-1">
                        {item.options?.map((o) => (
                          <div key={o.key}><strong>{o.key}:</strong> {o.text}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setPasteModalOpen(false)}
              className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedPastedItems.length === 0}
              onClick={handleAcceptPastedQuestions}
              className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] disabled:opacity-40"
            >
              Accept Parsed Questions ({parsedPastedItems.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderGeminiModal() {
    if (!geminiModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
        <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#1A4D2E]" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Generate Questions with Gemini AI
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setGeminiModalOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          {stagedQuestions.length === 0 && (
            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-3 gap-2.5 rounded-2xl bg-stone-50 border border-stone-200 p-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Accepted Saved</span>
                  <strong className="text-base font-serif font-bold text-stone-900">{currentSectionQuestions.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Target Goal</span>
                  <strong className="text-base font-serif font-bold text-[#1A4D2E]">{targetQuestionCount}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Remaining Needed</span>
                  <strong className="text-base font-serif font-bold text-amber-700">
                    {Math.max(0, targetQuestionCount - currentSectionQuestions.length)}
                  </strong>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase text-[10px] block">Target Subject</label>
                  <input
                    type="text"
                    disabled
                    value={JAMB_SUBJECT_LABELS[activeSection]}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 uppercase text-[10px] block">Syllabus Topic / Subtopic</label>
                  <input
                    type="text"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    placeholder="e.g. Kinematics, Organic Chemistry"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 uppercase text-[10px] block">
                    Target Total Questions to Fill (No Artificial Cap)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={targetQuestionCount}
                    onChange={(e) => setTargetQuestionCount(Math.max(1, Number(e.target.value)))}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 uppercase text-[10px] block">
                    Generation Batch Size (per API Request)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-stone-700 uppercase text-[10px] block">Difficulty Level</label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium bg-white"
                  >
                    <option value="JAMB UTME Standard">JAMB UTME Standard</option>
                    <option value="Advanced Problem Solving">Advanced Problem Solving</option>
                    <option value="Foundational Recall">Foundational Recall</option>
                  </select>
                </div>
              </div>

              {genLoading && genStatusText && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-center gap-2 font-medium animate-pulse">
                  <RefreshCw className="size-4 animate-spin text-emerald-600 shrink-0" />
                  <span>{genStatusText}</span>
                </div>
              )}

              {genError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2 font-medium">
                  <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                  <span>{genError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                <span className="text-[11px] text-stone-500">
                  Will generate up to {Math.max(1, targetQuestionCount - currentSectionQuestions.length)} questions in batches of {batchSize}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGeminiModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={genLoading}
                    onClick={handleExecuteGeminiGeneration}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] disabled:opacity-50"
                  >
                    {genLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    <span>{genLoading ? "Generating Questions..." : "Execute Generation Pipeline"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {stagedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700">
                  Review Staged Questions ({stagedQuestions.filter((q) => q.selected).length} selected)
                </span>
                <span className="text-stone-500 text-[11px]">
                  Inspect each item before adding to {JAMB_SUBJECT_LABELS[activeSection]}
                </span>
              </div>

              <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                {stagedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-900">
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={(e) => {
                            const copy = [...stagedQuestions];
                            copy[idx].selected = e.target.checked;
                            setStagedQuestions(copy);
                          }}
                          className="accent-[#1A4D2E] size-4"
                        />
                        <span>Generated Item #{idx + 1}</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        {q.topic && (
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                            {q.topic}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Key: {q.answer}
                        </span>
                      </div>
                    </div>

                    <p className="font-serif text-stone-900 font-medium">
                      <InlineMathText text={q.prompt} />
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600">
                      {q.options?.map((opt) => (
                        <div
                          key={opt.key}
                          className={cn(
                            "px-2 py-1 rounded-md border",
                            opt.key === q.answer
                              ? "bg-emerald-50 border-emerald-200 font-semibold text-emerald-900"
                              : "bg-white border-stone-200"
                          )}
                        >
                          <strong>{opt.key}:</strong> {opt.text}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="text-[10px] text-stone-500 italic pt-1 border-t border-stone-200/60">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setStagedQuestions([])}
                  className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  ← Configure Again
                </button>
                <button
                  type="button"
                  onClick={handleAcceptStagedQuestions}
                  className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
                >
                  Accept Selected into Section ({stagedQuestions.filter((q) => q.selected).length})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderValidationModal() {
    if (!validationModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
        <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="size-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Validation Requirements Pending
              </h3>
              <p className="text-xs text-stone-600 font-sans">
                The examination cannot be published until the following section requirements are resolved:
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-xs font-sans max-h-60 overflow-y-auto p-1">
            {validationErrors.map((err, i) => (
              <li
                key={i}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-900 flex items-start justify-between gap-2"
              >
                <span>{err.message}</span>
                {err.section && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection(err.section as JambSectionSubject);
                      setValidationModalOpen(false);
                    }}
                    className="text-[10px] font-bold text-[#1A4D2E] underline uppercase shrink-0"
                  >
                    Jump to section
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setValidationModalOpen(false)}
              className="px-5 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold"
            >
              Understood, I will fix them
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderScheduleModal() {
    if (!scheduleModalOpen || !schedulingExam) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
        <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-[#1A4D2E]" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Schedule Examination Window
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          {schedError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0 text-rose-600" />
              <span>{schedError}</span>
            </div>
          )}

          <div className="space-y-4 text-xs font-sans">
            <div>
              <span className="font-bold text-stone-700 uppercase text-[10px] block mb-1">
                Examination Title
              </span>
              <p className="font-serif text-sm font-bold text-stone-900">{schedulingExam.title}</p>
              <span className="text-[11px] text-stone-500">Period: {schedulingExam.weekOrPeriod}</span>
            </div>

            <div>
              <label className="font-bold text-stone-700 uppercase text-[10px] block mb-1">
                Scheduled Release / Start Time (WAT / Africa/Lagos)
              </label>
              <input
                type="datetime-local"
                value={schedStartInput}
                onChange={(e) => setSchedStartInput(e.target.value)}
                className="w-full rounded-xl border border-stone-200 p-3 text-xs font-medium focus:border-[#1A4D2E] focus:outline-hidden"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                When this time is reached, the exam automatically opens for students.
              </span>
            </div>

            <div>
              <label className="font-bold text-stone-700 uppercase text-[10px] block mb-1">
                Closing / Expiry Time (WAT / Africa/Lagos)
              </label>
              <input
                type="datetime-local"
                value={schedEndInput}
                onChange={(e) => setSchedEndInput(e.target.value)}
                className="w-full rounded-xl border border-stone-200 p-3 text-xs font-medium focus:border-[#1A4D2E] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-200">
            {schedulingExam.status === "scheduled" || schedulingExam.status === "published" ? (
              <button
                type="button"
                onClick={handleCancelSchedule}
                className="px-4 py-2 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold"
              >
                Cancel Schedule (Revert to Draft)
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveSchedule("draft")}
                className="px-4 py-2 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveSchedule("scheduled")}
                className="px-5 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
              >
                Schedule & Lock
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAuditModal() {
    if (!auditModalOpen || !auditExam || !auditReport) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans overflow-y-auto">
        <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[#1A4D2E]" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Examination Uniqueness & Quality Audit
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAuditModalOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-900 block text-sm">{auditExam.title}</span>
                <span className="text-stone-500">Audited Questions: <strong>{auditReport.totalQuestions}</strong></span>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold",
                auditReport.similarCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              )}>
                {auditReport.similarCount > 0 ? `${auditReport.similarCount} Duplicates Flagged` : "100% Unique & Verified"}
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-800 block text-xs">Audit Findings & Issues:</span>
              {auditReport.issues.length === 0 ? (
                <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-center text-emerald-900 space-y-1">
                  <CheckCircle2 className="size-6 text-emerald-600 mx-auto" />
                  <p className="font-bold">No duplicates or quality issues detected!</p>
                  <p className="text-[11px] text-emerald-700">This question bank is clean and ready for JAMB candidates.</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {auditReport.issues.map((issue, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>[{issue.section.toUpperCase()}] ID: {issue.questionId}</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 text-[10px]">
                          Similarity: {Math.round(issue.similarityScore * 100)}%
                        </span>
                      </div>
                      <p className="text-stone-800 font-serif italic text-xs">"{issue.prompt}"</p>
                      <p className="text-[11px] text-amber-800">
                        {issue.matchType === "exact_duplicate" ? "Exact duplicate" : "High similarity"} with: "{issue.matchedWithPrompt}" {issue.matchedExamTitle ? `(${issue.matchedExamTitle})` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setAuditModalOpen(false)}
              className="px-5 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold"
            >
              Close Audit Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDeleteConfirmModal() {
    if (!deleteConfirmTarget) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
        <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4">
          <div className="size-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="size-6 text-rose-600" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Confirm Deletion
            </h3>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Are you sure you want to delete <strong>{deleteConfirmTarget.name}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmTarget(null)}
              className="flex-1 min-h-10 rounded-full border border-stone-200 text-xs font-bold text-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirmTarget.type === "exam") {
                  deleteAdminExam(deleteConfirmTarget.examId);
                  setView("library");
                  notifySaved("Examination deleted.");
                } else if (
                  deleteConfirmTarget.type === "question" &&
                  deleteConfirmTarget.section &&
                  deleteConfirmTarget.questionId
                ) {
                  deleteQuestionFromSection(
                    deleteConfirmTarget.examId,
                    deleteConfirmTarget.section,
                    deleteConfirmTarget.questionId
                  );
                  notifySaved("Question deleted from section.");
                }
                setDeleteConfirmTarget(null);
              }}
              className="flex-1 min-h-10 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAllModals() {
    return (
      <>
        {renderScheduleModal()}
        {renderAuditModal()}
        {renderQuestionModal()}
        {renderPasteModal()}
        {renderGeminiModal()}
        {renderValidationModal()}
        {renderDeleteConfirmModal()}
      </>
    );
  }

  // =========================================================================
  // VIEW 1: EXAMINATION CONTROL CENTER DASHBOARD & LIBRARY
  // =========================================================================
  if (view === "library") {
    return (
      <div className="space-y-8 pb-16 font-sans">
        {/* Toast Save Notification */}
        {saveBanner && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-stone-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-3">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>{saveBanner}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <span className="px-3 py-1 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-bold uppercase tracking-wider">
              Examination Administration
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#2A2422] font-bold mt-2 tracking-tight">
              JAMB Examination Center
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
              Manage the current live examination, author next week's paper in advance, and maintain 100% fresh questions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCreateNextWeekExam}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white hover:bg-[#153e25] transition-colors shadow-xs"
            >
              <Plus className="size-4" />
              <span>Prepare Week {nextWeekNum} Paper</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: CURRENT LIVE EXAMINATION CARD                                  */}
        {/* ========================================================================= */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                1. Current Live Examination
              </span>
            </div>
            <span className="text-xs text-stone-500 font-mono">Timezone: Africa/Lagos (WAT)</span>
          </div>

          {!currentLiveExam ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-6 text-center space-y-3">
              <div className="size-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Calendar className="size-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">No Weekly Exam Currently Active</h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed font-sans">
                There is currently no weekly examination active for students. You can publish a draft or set a new paper.
              </p>
              <button
                type="button"
                onClick={handleSetThisWeeksExam}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
              >
                <Plus className="size-4" /> Set Active Weekly Exam
              </button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      liveLifecycle === "open"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    )}
                  >
                    {liveLifecycle === "open" ? "Live & Open to Candidates" : "Upcoming Scheduled"}
                  </span>
                  <span className="text-xs font-semibold text-[#1A4D2E]">
                    {currentLiveExam.weekOrPeriod}
                  </span>
                </div>

                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                  {currentLiveExam.title}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 font-sans">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-stone-400" />
                    <span>Duration: {currentLiveExam.durationMinutes} Mins</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-stone-400" />
                    <span>Closes: {formatLagosDateTime(currentLiveExam.endAt)}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="size-3.5 text-stone-400" />
                    <span>
                      {Object.values(currentLiveExam.sections).reduce((s, l) => s + l.length, 0)} Questions
                    </span>
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveExamId(currentLiveExam.id);
                    setActiveSection("english");
                    setView("editor");
                  }}
                  className="px-4 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] text-center"
                >
                  Section Editor
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenScheduleModal(currentLiveExam)}
                  className="px-3.5 py-2.5 rounded-full border border-stone-300 bg-white text-stone-800 text-xs font-semibold hover:bg-stone-50 flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="size-3.5 text-stone-500" />
                  <span>Reschedule</span>
                </button>

                <Link
                  to="/studio/cbt/weekly/$examId"
                  params={{ examId: currentLiveExam.id }}
                  className="px-4 py-2.5 rounded-full border border-stone-200 text-stone-800 text-xs font-semibold hover:bg-stone-50 text-center"
                >
                  Student View →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: NEXT SCHEDULED EXAMINATION (PREPARE IN ADVANCE)                 */}
        {/* ========================================================================= */}
        <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-50 to-[#FCFAF7] p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-700" />
                2. Next Scheduled Examination (Advance Preparation)
              </span>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              Safe Cycle: Preparing next week does not alter live exam
            </span>
          </div>

          {!nextScheduledExam ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 sm:p-7 text-center space-y-3">
              <div className="size-11 rounded-full bg-emerald-50 text-[#1A4D2E] flex items-center justify-center mx-auto">
                <Plus className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Ready to Prepare Week {nextWeekNum} Examination?
              </h3>
              <p className="text-xs text-stone-600 max-w-lg mx-auto leading-relaxed font-sans">
                You can draft and stage questions for Week {nextWeekNum} right now while Week {currentLiveExam ? currentLiveExam.title.replace(/[^0-9]/g, "") || "1" : "1"} remains live for candidates. Questions will be anti-duplicate checked automatically.
              </p>
              <button
                type="button"
                onClick={handleCreateNextWeekExam}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] shadow-xs"
              >
                <Plus className="size-4" /> Create Week {nextWeekNum} Draft Now
              </button>
            </div>
          ) : (
            <div className="space-y-4 bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        nextScheduledExam.status === "draft"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-blue-100 text-blue-900 border border-blue-300"
                      )}
                    >
                      {nextScheduledExam.status === "draft" ? "Scheduled Draft (Preparing)" : "Scheduled & Locked until Start"}
                    </span>
                    <span className="text-xs font-semibold text-[#1A4D2E]">
                      {nextScheduledExam.weekOrPeriod}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                    {nextScheduledExam.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 font-sans">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-blue-600" />
                      <span>Release (WAT): <strong>{formatLagosDateTime(nextScheduledExam.startAt)}</strong></span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-stone-400" />
                      <span>Closes: {formatLagosDateTime(nextScheduledExam.endAt)}</span>
                    </span>
                  </div>

                  {scheduledCountdown && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-900 font-medium">
                      <Clock className="size-3.5 text-blue-600" />
                      <span>Release Countdown: <strong className="font-mono font-bold text-blue-950">{scheduledCountdown}</strong></span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveExamId(nextScheduledExam.id);
                      setActiveSection("english");
                      setView("editor");
                    }}
                    className="px-4 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] text-center"
                  >
                    Edit Questions
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenScheduleModal(nextScheduledExam)}
                    className="px-3.5 py-2.5 rounded-full border border-stone-300 bg-white text-stone-800 text-xs font-semibold hover:bg-stone-50 flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="size-3.5 text-stone-500" />
                    <span>Set Schedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunAudit(nextScheduledExam)}
                    className="px-3.5 py-2.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="size-3.5 text-emerald-700" />
                    <span>Uniqueness Audit</span>
                  </button>
                </div>
              </div>

              {/* 5-Subject Preparation Progress */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
                    Pool Assembly Progress (220 Questions Target)
                  </span>
                  <span className="font-semibold text-stone-900 font-mono">
                    {Object.values(nextScheduledExam.sections).reduce((s, l) => s + l.length, 0)} / 220 Questions
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {ALL_JAMB_SECTIONS.map((subj) => {
                    const count = (nextScheduledExam.sections[subj] || []).length;
                    const target = JAMB_SECTION_TARGETS[subj];
                    const complete = count >= target;
                    return (
                      <div
                        key={subj}
                        className={cn(
                          "p-2.5 rounded-xl border text-center space-y-0.5",
                          complete
                            ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                            : count > 0
                            ? "border-amber-200 bg-amber-50/70 text-amber-900"
                            : "border-stone-200 bg-stone-50 text-stone-600"
                        )}
                      >
                        <span className="font-bold block text-[11px] truncate">
                          {JAMB_SUBJECT_LABELS[subj]}
                        </span>
                        <span className="text-[10px] font-mono font-semibold">
                          {count} / {target} {complete ? "✓" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* EXAMINATION LIBRARY & HISTORY TABS                                        */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100/80 border border-stone-200 overflow-x-auto">
              <button
                type="button"
                onClick={() => setLibraryFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  libraryFilter === "all" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                )}
              >
                All Exams ({adminExams.length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryFilter("weekly_jamb")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  libraryFilter === "weekly_jamb" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                )}
              >
                Weekly JAMB ({adminExams.filter((e) => e.type === "weekly_jamb").length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryFilter("full_jamb_mock")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  libraryFilter === "full_jamb_mock" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                )}
              >
                Full Mocks ({adminExams.filter((e) => e.type === "full_jamb_mock").length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryFilter("drafts")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                  libraryFilter === "drafts" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                )}
              >
                Drafts ({adminExams.filter((e) => e.status === "draft").length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryFilter("history")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1",
                  libraryFilter === "history" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <History className="size-3 text-stone-500" />
                <span>History ({adminExams.filter((e) => getExamLifecycleState(e.startAt, e.endAt, e.status) === "closed" || e.status === "archived").length})</span>
              </button>
            </div>
            <span className="text-xs text-stone-500 font-sans">Africa/Lagos (WAT)</span>
          </div>

          {/* Table of Examinations */}
          {filteredExams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-12 text-center space-y-3">
              <BookOpen className="size-10 text-stone-400 mx-auto opacity-70" />
              <h3 className="font-serif text-lg font-bold text-stone-800">No Examinations Found</h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto font-sans leading-relaxed">
                {libraryFilter === "history"
                  ? "Completed and archived examinations will be listed here after their scheduled duration finishes."
                  : "Create a new 5-subject Weekly JAMB test or Full JAMB Mock to begin authoring questions."}
              </p>
              {libraryFilter !== "history" && (
                <button
                  type="button"
                  onClick={() => {
                    const newId = createWeeklyJambExam();
                    setActiveExamId(newId);
                    setActiveSection("english");
                    setView("editor");
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold"
                >
                  <Plus className="size-4" /> Create First Weekly JAMB Test
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-xs">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-stone-200 bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Examination Title & Period</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Subject Pools & Targets</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Scheduled Start (WAT)</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {filteredExams.map((exam) => {
                    const isWeekly = exam.type === "weekly_jamb";
                    const totalQ = Object.values(exam.sections).reduce((sum, list) => sum + list.length, 0);

                    const filledSectionsCount = ALL_JAMB_SECTIONS.filter(
                      (s) => (exam.sections[s] || []).length >= (JAMB_SECTION_TARGETS[s] || 40)
                    ).length;

                    const lifecycle = getExamLifecycleState(exam.startAt, exam.endAt, exam.status);

                    return (
                      <tr key={exam.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-5 py-4 font-semibold text-stone-900">
                          <div className="font-serif text-sm font-bold text-stone-900">{exam.title}</div>
                          <span className="text-[11px] text-stone-500 font-normal font-sans">
                            {exam.weekOrPeriod} · {exam.durationMinutes} mins
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              isWeekly
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                : "bg-blue-100 text-blue-900 border border-blue-200"
                            )}
                          >
                            {isWeekly ? "Weekly JAMB (5 Sec)" : "Full Mock (180 Qs)"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span className="font-semibold text-stone-800">
                              {totalQ} questions total
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  filledSectionsCount === 5 ? "bg-emerald-600" : "bg-amber-500"
                                )}
                              />
                              <span>{filledSectionsCount}/5 sections target met</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              exam.status === "published"
                                ? lifecycle === "open"
                                  ? "bg-emerald-100 text-emerald-800 font-bold"
                                  : lifecycle === "coming_soon"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-stone-100 text-stone-700"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {exam.status === "draft"
                              ? "Draft"
                              : lifecycle === "open"
                              ? "Open Now"
                              : lifecycle === "coming_soon"
                              ? "Upcoming"
                              : "Closed / History"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-stone-600 text-[11px]">
                          {formatLagosDateTime(exam.startAt).split("(")[0]}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveExamId(exam.id);
                                if (isWeekly) {
                                  setActiveSection("english");
                                  setView("editor");
                                } else {
                                  setView("mock_editor");
                                }
                              }}
                              className="px-3 py-1 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] transition-colors"
                            >
                              Edit
                            </button>

                            <Link
                              to="/studio/cbt/weekly/$examId"
                              params={{ examId: exam.id }}
                              className="px-2.5 py-1 rounded-full border border-stone-200 text-stone-700 hover:text-stone-900 text-xs font-semibold"
                            >
                              Preview
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmTarget({
                                  type: "exam",
                                  examId: exam.id,
                                  name: exam.title,
                                })
                              }
                              className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                              title="Delete examination"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {renderAllModals()}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FULL JAMB MOCK CONFIGURATOR
  // =========================================================================
  if (view === "mock_editor" && activeExam) {
    return (
      <div className="space-y-6 pb-16 font-sans">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-sans">
            <button
              type="button"
              onClick={() => setView("library")}
              className="text-[#1A4D2E] font-bold hover:underline"
            >
              Examinations
            </button>
            <span>/</span>
            <span className="font-semibold text-stone-900">{activeExam.title}</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold uppercase">
              Full Mock Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("library")}
              className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              ← Back to Library
            </button>
            <Link
              to="/studio/cbt"
              className="px-4 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
            >
              Preview CBT Hub →
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-7 shadow-xs space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Full JAMB Mock Configuration
            </span>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              180-Question 4-Subject UTME Simulation
            </h2>
            <p className="text-xs text-stone-600 font-sans">
              This examination mode mirrors the official 2-hour JAMB UTME exam. Students are tested on Use of English (60 questions) plus their 3 registered subject electives (40 questions each).
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Mock Title</label>
              <input
                type="text"
                value={activeExam.title}
                onChange={(e) => updateAdminExam(activeExam.id, { title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Exam Period / Cycle</label>
              <input
                type="text"
                value={activeExam.weekOrPeriod}
                onChange={(e) => updateAdminExam(activeExam.id, { weekOrPeriod: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-700 uppercase">Instructions for Candidate</label>
              <textarea
                rows={3}
                value={activeExam.instructions}
                onChange={(e) => updateAdminExam(activeExam.id, { instructions: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Total Questions</label>
              <input
                type="number"
                disabled
                value={180}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-100 text-stone-500 px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Duration</label>
              <input
                type="text"
                disabled
                value="120 Minutes (2 Hours)"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-100 text-stone-500 px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => notifySaved("Mock configuration updated.")}
              className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
            >
              Save Configuration
            </button>
          </div>
        </div>
        {renderAllModals()}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: WEEKLY JAMB TEST EDITOR (1 TEST, 5 SUBJECT SECTIONS)
  // =========================================================================
  if (!activeExam) return null;

  const currentSectionQuestions = activeExam.sections[activeSection] || [];
  const activeSectionTarget = JAMB_SECTION_TARGETS[activeSection] || 40;

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Toast Save Notification */}
      {saveBanner && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-stone-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Breadcrumbs & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <button
              type="button"
              onClick={() => setView("library")}
              className="text-[#1A4D2E] font-bold hover:underline"
            >
              Examinations
            </button>
            <span>/</span>
            <span className="font-semibold text-stone-800">{activeExam.title}</span>
            <span>/</span>
            <span className="font-bold text-[#1A4D2E]">{JAMB_SUBJECT_LABELS[activeSection]}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              {activeExam.title}
            </h1>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                activeExam.status === "published"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {activeExam.status}
            </span>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView("library")}
            className="px-3.5 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            ← Dashboard
          </button>

          <button
            type="button"
            onClick={() => handleOpenScheduleModal(activeExam)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-300 bg-white text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            <SlidersHorizontal className="size-3.5 text-stone-500" />
            <span>Schedule Release</span>
          </button>

          <button
            type="button"
            onClick={() => handleRunAudit(activeExam)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            <ShieldCheck className="size-3.5 text-emerald-700" />
            <span>Uniqueness Audit</span>
          </button>

          <button
            type="button"
            onClick={() => notifySaved("Draft saved.")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-300 bg-white text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            <Save className="size-3.5 text-stone-500" />
            <span>Save Draft</span>
          </button>


          <button
            type="button"
            onClick={handlePublishCurrentExam}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] transition-colors shadow-xs"
          >
            <Send className="size-3.5" />
            <span>Validate & Publish</span>
          </button>

          <Link
            to="/studio/cbt/weekly/$examId"
            params={{ examId: activeExam.id }}
            className="px-3 py-2 rounded-full border border-stone-200 text-stone-600 hover:text-stone-900 text-xs font-medium"
            title="Preview student examination view"
          >
            <Eye className="size-4" />
          </Link>
        </div>
      </div>

      {/* Test Metadata & Scheduling Bar */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-bold text-stone-500 uppercase text-[10px] block">Test Title</label>
            <input
              type="text"
              value={activeExam.title}
              onChange={(e) => updateAdminExam(activeExam.id, { title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-stone-500 uppercase text-[10px] block">Week / Period Label</label>
            <input
              type="text"
              value={activeExam.weekOrPeriod}
              onChange={(e) => updateAdminExam(activeExam.id, { weekOrPeriod: e.target.value })}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-stone-500 uppercase text-[10px] block">Duration (Minutes)</label>
            <input
              type="number"
              min={15}
              max={180}
              value={activeExam.durationMinutes}
              onChange={(e) => updateAdminExam(activeExam.id, { durationMinutes: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-500 uppercase text-[10px] block">Scheduled Window (WAT)</label>
              <button
                type="button"
                onClick={() => handleOpenScheduleModal(activeExam)}
                className="text-[10px] font-bold text-[#1A4D2E] hover:underline"
              >
                Change
              </button>
            </div>
            <p className="mt-2 text-stone-600 text-[11px] truncate">
              {formatLagosDateTime(activeExam.startAt).split("(")[0]}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Section Subject Navigator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-500 uppercase tracking-wider text-[11px]">
            The 5 Subject Sections (Master Collection)
          </span>
          <span className="text-xs text-stone-500">
            Total Section Questions:{" "}
            <strong className="text-stone-900">
              {Object.values(activeExam.sections).reduce((s, list) => s + list.length, 0)}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ALL_JAMB_SECTIONS.map((subjKey) => {
            const list = activeExam.sections[subjKey] || [];
            const isActive = activeSection === subjKey;
            const target = JAMB_SECTION_TARGETS[subjKey];
            const isTargetMet = list.length >= target;

            return (
              <button
                key={subjKey}
                type="button"
                onClick={() => setActiveSection(subjKey)}
                className={cn(
                  "p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[82px]",
                  isActive
                    ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow-xs"
                    : "border-stone-200 bg-white text-stone-800 hover:border-stone-400"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-bold", isActive ? "text-white" : "text-stone-900")}>
                    {JAMB_SUBJECT_LABELS[subjKey]}
                  </span>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      isTargetMet ? "bg-emerald-400" : list.length > 0 ? "bg-amber-400" : "bg-rose-400"
                    )}
                    title={isTargetMet ? `Target met (${list.length}/${target})` : `Incomplete (${list.length}/${target})`}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 pt-1">
                  <span className={cn("text-[11px] font-medium", isActive ? "text-emerald-100" : "text-stone-600")}>
                    {list.length} / {target} Qs
                  </span>
                  {subjKey === "english" && (
                    <span className={cn("text-[9px] font-bold uppercase", isActive ? "text-emerald-200" : "text-[#1A4D2E]")}>
                      Compulsory
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Subject Workspace for Active Section */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Workspace Subheader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                {JAMB_SUBJECT_LABELS[activeSection]} Section
              </h2>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                currentSectionQuestions.length >= activeSectionTarget
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              )}>
                {currentSectionQuestions.length} / {activeSectionTarget} Questions Target
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1 font-sans">
              {JAMB_SUBJECT_ROLES[activeSection]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenQuestionModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-300 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              <Plus className="size-4" />
              <span>Manual Entry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPasteRawText("");
                setParsedPastedItems([]);
                setPasteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-300 bg-stone-50 text-xs font-bold text-stone-800 hover:bg-stone-100"
            >
              <ClipboardList className="size-4 text-stone-600" />
              <span>Paste Question Block</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = JAMB_SECTION_TARGETS[activeSection] || 40;
                setTargetQuestionCount(target);
                setBatchSize(10);
                setGenTopic(`${JAMB_SUBJECT_LABELS[activeSection]} Core Topics`);
                setStagedQuestions([]);
                setGenError(null);
                setGeminiModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] shadow-xs"
            >
              <Sparkles className="size-4" />
              <span>Generate with Gemini</span>
            </button>

          </div>
        </div>

        {/* Question Rows List */}
        {currentSectionQuestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-10 text-center space-y-3">
            <BookOpen className="size-8 text-stone-400 mx-auto opacity-60" />
            <h3 className="font-serif text-base font-bold text-stone-800">
              No questions in {JAMB_SUBJECT_LABELS[activeSection]} yet
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto font-sans leading-relaxed">
              Supply questions by pasting text, running Gemini AI generation, or manual entry.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenQuestionModal()}
                className="px-4 py-2 rounded-full border border-stone-300 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              >
                + Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setPasteModalOpen(true)}
                className="px-4 py-2 rounded-full border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 hover:bg-stone-100"
              >
                📋 Paste Questions
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {currentSectionQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 hover:border-stone-300 transition-all space-y-3"
              >
                {/* Question Row Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[#1A4D2E] text-white text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    {q.topic && (
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                        {q.topic}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Answer: Key {q.answer}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenQuestionModal(q)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100"
                      title="Edit question"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        duplicateQuestionInSection(activeExam.id, activeSection, q.id);
                        notifySaved("Question duplicated.");
                      }}
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100"
                      title="Duplicate question"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmTarget({
                          type: "question",
                          examId: activeExam.id,
                          section: activeSection,
                          questionId: q.id,
                          name: `Question #${idx + 1}`,
                        })
                      }
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                      title="Delete question"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prompt Preview with LaTeX Support */}
                <div className="text-xs sm:text-sm font-serif text-stone-900 leading-relaxed pl-1">
                  <InlineMathText text={q.prompt} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {q.options?.map((opt) => {
                    const isCorrect = q.answer === opt.key;
                    return (
                      <div
                        key={opt.key}
                        className={cn(
                          "px-3 py-2 rounded-xl border flex items-center gap-2",
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50/70 text-emerald-950 font-medium"
                            : "border-stone-100 bg-stone-50/60 text-stone-700"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            isCorrect ? "bg-emerald-600 text-white" : "border border-stone-300 text-stone-500"
                          )}
                        >
                          {opt.key}
                        </span>
                        <span className="truncate">
                          <InlineMathText text={opt.text} />
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Snippet if available */}
                {q.explanation && (
                  <p className="text-[11px] text-stone-500 font-sans border-t border-stone-100 pt-2 italic line-clamp-2">
                    Explanation: {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Global Modals */}
      {renderAllModals()}
    </div>
  );
}

