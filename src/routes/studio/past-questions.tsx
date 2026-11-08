import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PenTool,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sliders,
  Check,
  X,
  Send,
} from "lucide-react";
import {
  getPublishedWaecPapers,
  buildPracticeSet,
  type WaecPaper,
  type PracticeSessionConfig,
} from "@/lib/waec-paper-store";
import type { Question, TheoryQuestion, Choice } from "@/data/catalog";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/cn";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { TheoryQuestionView } from "@/components/TheoryQuestionView";

export const Route = createFileRoute("/studio/past-questions")({
  component: StudentPastQuestionsPage,
});

export function StudentPastQuestionsPage() {
  const publishedPapers = useMemo(() => getPublishedWaecPapers(), []);
  const record = useSession((s) => s.record);
  const navigate = useNavigate();

  // Mode: "config" | "active_test" | "results"
  const [sessionPhase, setSessionPhase] = useState<"config" | "active_test" | "results">("config");

  // Step 1: Subject Selection
  const availableSubjects = useMemo(() => {
    const map = new Map<string, { name: string; count: number; years: string[] }>();
    for (const paper of publishedPapers) {
      const existing = map.get(paper.subject) || { name: paper.subject, count: 0, years: [] };
      existing.count += (paper.objectives?.length || 0) + (paper.theory?.length || 0);
      if (!existing.years.includes(String(paper.year))) {
        existing.years.push(String(paper.year));
      }
      map.set(paper.subject, existing);
    }
    return Array.from(map.values());
  }, [publishedPapers]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    availableSubjects[0]?.name || "Physics"
  );

  // Available years for chosen subject
  const availableYearsForSubject = useMemo(() => {
    return publishedPapers
      .filter((p) => p.subject.toLowerCase() === selectedSubject.toLowerCase())
      .map((p) => String(p.year))
      .sort((a, b) => Number(b) - Number(a));
  }, [publishedPapers, selectedSubject]);

  // Year mode: "specific" vs "mixed"
  const [yearMode, setYearMode] = useState<"specific" | "mixed">("specific");
  const [selectedYear, setSelectedYear] = useState<string>(
    availableYearsForSubject[0] || "2024"
  );

  // Keep selectedYear valid when subject changes
  useEffect(() => {
    if (availableYearsForSubject.length > 0 && !availableYearsForSubject.includes(selectedYear)) {
      setSelectedYear(availableYearsForSubject[0]);
    }
  }, [availableYearsForSubject, selectedYear]);

  // Determine sections available for the current selection
  const relevantPapers = useMemo(() => {
    const list = publishedPapers.filter(
      (p) => p.subject.toLowerCase() === selectedSubject.toLowerCase()
    );
    if (yearMode === "specific") {
      return list.filter((p) => String(p.year) === selectedYear);
    }
    return list;
  }, [publishedPapers, selectedSubject, yearMode, selectedYear]);

  const totalAvailableObjectives = useMemo(() => {
    let count = 0;
    for (const p of relevantPapers) {
      count += p.objectives?.length || 0;
    }
    return count;
  }, [relevantPapers]);

  const totalAvailableTheory = useMemo(() => {
    let count = 0;
    for (const p of relevantPapers) {
      count += p.theory?.length || 0;
    }
    return count;
  }, [relevantPapers]);

  const hasObjQuestions = totalAvailableObjectives > 0;
  const hasTheoryQuestions = totalAvailableTheory > 0;

  // Step 2: Configure session
  const [selectedSection, setSelectedSection] = useState<"objective" | "theory" | "both">("both");

  // Keep section valid based on what actually exists
  useEffect(() => {
    if (hasObjQuestions && hasTheoryQuestions) {
      setSelectedSection("both");
    } else if (hasObjQuestions) {
      setSelectedSection("objective");
    } else if (hasTheoryQuestions) {
      setSelectedSection("theory");
    }
  }, [hasObjQuestions, hasTheoryQuestions]);

  const currentMaxQuestions = useMemo(() => {
    if (selectedSection === "objective") return totalAvailableObjectives;
    if (selectedSection === "theory") return totalAvailableTheory;
    return totalAvailableObjectives + totalAvailableTheory;
  }, [selectedSection, totalAvailableObjectives, totalAvailableTheory]);

  const maxAllowedCount = Math.max(1, currentMaxQuestions);
  const [questionCount, setQuestionCount] = useState<number>(currentMaxQuestions || 10);

  useEffect(() => {
    if (currentMaxQuestions > 0) {
      setQuestionCount((prev) => Math.min(prev > 0 ? prev : currentMaxQuestions, currentMaxQuestions));
    }
  }, [currentMaxQuestions]);

  // Active Practice State
  const [activeQuestions, setActiveQuestions] = useState<(Question | (TheoryQuestion & { theory: true }))[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Choice>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  // Results & Theory Marking State
  const [completedAttemptId, setCompletedAttemptId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalObjTotal, setFinalObjTotal] = useState(0);
  const [finalTheoryTotal, setFinalTheoryTotal] = useState(0);

  const [isMarkingTheory, setIsMarkingTheory] = useState(false);
  const [theoryMarkingResult, setTheoryMarkingResult] = useState<{
    totalMarksAwarded: number;
    totalMaxMarks: number;
    results: Array<{
      questionLabel: string;
      questionText?: string;
      marksAwarded: number;
      maxMarks: number;
      studentAnswerParsed: string;
      feedback: string;
      needsReview?: boolean;
    }>;
  } | null>(null);

  // Timer interval
  useEffect(() => {
    if (sessionPhase !== "active_test") return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionPhase, startTime]);

  // Start Practice action
  function handleStartPractice() {
    const practiceConfig: PracticeSessionConfig = {
      subject: selectedSubject,
      subjectId: selectedSubject.toLowerCase().replace(/\s+/g, "-"),
      yearMode,
      year: yearMode === "specific" ? selectedYear : undefined,
      sections: selectedSection,
      questionCount,
    };

    const practiceSet = buildPracticeSet(practiceConfig);
    if (practiceSet.questions.length === 0) {
      alert("No questions available for this selection.");
      return;
    }

    setActiveQuestions(practiceSet.questions);
    setCurrentIndex(0);
    setPicks({});
    setWrittenAnswers({});
    setTheoryMarkingResult(null);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setSubmitConfirmOpen(false);
    setSessionPhase("active_test");
  }

  // Submit test action
  function handleSubmitTest() {
    let objScore = 0;
    let objTotal = 0;
    let theoryTotal = 0;

    const payloadTheoryQuestions: any[] = [];
    let combinedStudentInput = "";

    const itemsSnapshot = activeQuestions.map((q, idx) => {
      const isTheory = "theory" in q && (q as any).theory;
      if (isTheory) {
        const tq = q as TheoryQuestion;
        theoryTotal++;
        const writtenVal = writtenAnswers[tq.id] || "";
        if (writtenVal.trim()) {
          combinedStudentInput += `\n\n[Question ${idx + 1} Answers]:\n${writtenVal.trim()}`;
        }

        if (Array.isArray((tq as any).parts) && (tq as any).parts.length > 0) {
          for (const part of (tq as any).parts) {
            const rawMarks = part.marks ? parseInt(String(part.marks).replace(/[^0-9]/g, "")) || 3 : 3;
            payloadTheoryQuestions.push({
              id: `${tq.id}-${part.label}`,
              questionLabel: part.label || `Question ${idx + 1}`,
              questionText: part.questionText || tq.prompt,
              maxMarks: rawMarks,
              markingScheme: part.directAnswer || part.tutorExplanation || tq.modelAnswer || "",
            });
          }
        } else {
          const rawMarks = (tq as any).marks ? parseInt(String((tq as any).marks).replace(/[^0-9]/g, "")) || 5 : 5;
          payloadTheoryQuestions.push({
            id: tq.id,
            questionLabel: `Question ${idx + 1}`,
            questionText: tq.prompt,
            maxMarks: rawMarks,
            markingScheme: tq.modelAnswer || "",
          });
        }

        return {
          id: tq.id,
          prompt: tq.prompt,
          theory: true as const,
          written: writtenVal,
          modelAnswer: tq.modelAnswer,
          parts: (tq as any).parts,
          diagramSvg: (tq as any).diagramSvg,
        };
      } else {
        const oq = q as Question;
        objTotal++;
        const studentPick = picks[oq.id];
        const isCorrect = studentPick && studentPick === oq.answer;
        if (isCorrect) objScore++;
        return {
          id: oq.id,
          prompt: oq.prompt,
          options: oq.options,
          answer: oq.answer,
          explain: oq.explain,
          pick: studentPick,
          answerKeyStatus: oq.answerKeyStatus || "shipped",
        };
      }
    });

    const title =
      yearMode === "specific"
        ? `WAEC ${selectedSubject} (${selectedYear})`
        : `WAEC ${selectedSubject} (Mixed Practice)`;

    const attemptId = record({
      topicId: `waec-${selectedSubject.toLowerCase()}-${yearMode === "specific" ? selectedYear : "mixed"}`,
      title,
      score: objScore,
      total: objTotal,
      kind: "waec",
      demo: false,
      picks,
      written: writtenAnswers,
      items: itemsSnapshot as any,
      subjectLabel: selectedSubject,
    });

    setFinalScore(objScore);
    setFinalObjTotal(objTotal);
    setFinalTheoryTotal(theoryTotal);
    setCompletedAttemptId(attemptId);
    setSubmitConfirmOpen(false);
    setSessionPhase("results");

    // Call Theory AI Marking if theory questions present
    if (payloadTheoryQuestions.length > 0) {
      setIsMarkingTheory(true);
      fetch("/api/student/mark-theory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentInputBlock: combinedStudentInput.trim() || "No response typed.",
          theoryQuestions: payloadTheoryQuestions,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.markingData) {
            setTheoryMarkingResult(data.markingData);
          }
        })
        .catch((err) => {
          console.warn("Theory marking request failed:", err);
        })
        .finally(() => {
          setIsMarkingTheory(false);
        });
    } else {
      setTheoryMarkingResult(null);
    }
  }

  function formatTime(secs: number): string {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  }

  const currentQ = activeQuestions[currentIndex];
  const isCurrentTheory = currentQ && "theory" in currentQ && currentQ.theory;

  const answeredCount = useMemo(() => {
    let count = 0;
    for (const q of activeQuestions) {
      if ("theory" in q && q.theory) {
        if (writtenAnswers[q.id]?.trim()) count++;
      } else {
        if (picks[q.id]) count++;
      }
    }
    return count;
  }, [activeQuestions, picks, writtenAnswers]);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. CONFIGURATION VIEW                                    */}
      {/* ========================================================= */}
      {sessionPhase === "config" && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1A4D2E]/10 text-[#1A4D2E] uppercase tracking-wider">
              Authentic WAEC Examination Papers
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink font-bold tracking-tight">
              WAEC Past Questions Practice
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto font-sans leading-relaxed">
              Practice official WAEC examination papers by subject and year, or build a mixed revision set with genuine AI-solved explanations.
            </p>
          </div>

          {availableSubjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center space-y-3">
              <BookOpen className="size-10 text-muted mx-auto opacity-50" />
              <h3 className="font-serif text-lg font-bold text-ink">No WAEC papers published yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                The administrator has not yet published any WAEC question papers.
              </p>
              <Link
                to="/admin/past-questions"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-semibold"
              >
                Go to Admin Past Questions →
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6 shadow-xs">
              {/* Step 1: Choose Subject */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Step 1: Choose Subject
                  </span>
                  <span className="text-xs text-muted font-medium">
                    {availableSubjects.length} subject(s) published
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {availableSubjects.map((sub) => {
                    const active = selectedSubject.toLowerCase() === sub.name.toLowerCase();
                    return (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() => setSelectedSubject(sub.name)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[72px]",
                          active
                            ? "border-[#1A4D2E] bg-[#1A4D2E]/5 text-ink ring-2 ring-[#1A4D2E]/20"
                            : "border-line bg-paper hover:border-ink/50"
                        )}
                      >
                        <span className="font-serif font-bold text-sm text-ink">{sub.name}</span>
                        <span className="text-[11px] text-muted">
                          {sub.years.length} paper(s) · {sub.count} Qs
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Year or Mixed Practice */}
              <div className="space-y-3 pt-3 border-t border-line/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Examination Year Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Specific Year Mode */}
                  <div
                    onClick={() => setYearMode("specific")}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all space-y-2",
                      yearMode === "specific"
                        ? "border-[#1A4D2E] bg-[#1A4D2E]/5 ring-2 ring-[#1A4D2E]/20"
                        : "border-line bg-paper hover:border-ink/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                        <Calendar className="size-4 text-[#1A4D2E]" />
                        <span>Specific Year Paper</span>
                      </span>
                      <input
                        type="radio"
                        checked={yearMode === "specific"}
                        onChange={() => setYearMode("specific")}
                        className="accent-[#1A4D2E]"
                      />
                    </div>
                    <p className="text-xs text-muted">Practice an official single-year paper.</p>

                    {yearMode === "specific" && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {availableYearsForSubject.map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedYear(yr);
                            }}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                              selectedYear === yr
                                ? "bg-[#1A4D2E] text-white shadow-2xs"
                                : "bg-surface border border-line text-ink hover:border-primary"
                            )}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mixed Practice Mode */}
                  <div
                    onClick={() => setYearMode("mixed")}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all space-y-2",
                      yearMode === "mixed"
                        ? "border-[#1A4D2E] bg-[#1A4D2E]/5 ring-2 ring-[#1A4D2E]/20"
                        : "border-line bg-paper hover:border-ink/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                        <Layers className="size-4 text-[#1A4D2E]" />
                        <span>Mixed Practice (All Years)</span>
                      </span>
                      <input
                        type="radio"
                        checked={yearMode === "mixed"}
                        onChange={() => setYearMode("mixed")}
                        className="accent-[#1A4D2E]"
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Combines questions across all available years ({availableYearsForSubject.join(", ")}).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Choose Sections */}
              <div className="space-y-3 pt-3 border-t border-line/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                  Step 2: Configure Sections & Question Count
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!hasObjQuestions}
                    onClick={() => setSelectedSection("objective")}
                    className={cn(
                      "p-3 rounded-2xl border text-center transition-all disabled:opacity-40",
                      selectedSection === "objective"
                        ? "border-[#1A4D2E] bg-[#1A4D2E] text-white font-bold"
                        : "border-line bg-paper text-ink"
                    )}
                  >
                    <span className="text-xs block">Objective Only</span>
                    <span className="text-[10px] opacity-75">{totalAvailableObjectives} Qs available</span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasTheoryQuestions}
                    onClick={() => setSelectedSection("theory")}
                    className={cn(
                      "p-3 rounded-2xl border text-center transition-all disabled:opacity-40",
                      selectedSection === "theory"
                        ? "border-[#1A4D2E] bg-[#1A4D2E] text-white font-bold"
                        : "border-line bg-paper text-ink"
                    )}
                  >
                    <span className="text-xs block">Theory Only</span>
                    <span className="text-[10px] opacity-75">{totalAvailableTheory} Qs available</span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasObjQuestions || !hasTheoryQuestions}
                    onClick={() => setSelectedSection("both")}
                    className={cn(
                      "p-3 rounded-2xl border text-center transition-all disabled:opacity-40",
                      selectedSection === "both"
                        ? "border-[#1A4D2E] bg-[#1A4D2E] text-white font-bold"
                        : "border-line bg-paper text-ink"
                    )}
                  >
                    <span className="text-xs block">Both Sections</span>
                    <span className="text-[10px] opacity-75">{totalAvailableObjectives + totalAvailableTheory} Qs available</span>
                  </button>
                </div>
              </div>

              {/* Step 4: Question Count Slider / Selector (Dynamic max based on section) */}
              <div className="space-y-3 pt-3 border-t border-line/60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Select Question Count
                    </span>
                    <p className="text-[11px] text-muted font-sans">
                      Maximum {currentMaxQuestions} questions · {currentMaxQuestions} available
                    </p>
                  </div>
                  <span className="font-serif text-2xl font-bold text-[#1A4D2E]">
                    {questionCount} <span className="text-xs text-muted font-normal">Qs</span>
                  </span>
                </div>

                {/* Touch-Friendly Range Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={1}
                    max={maxAllowedCount}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-[#1A4D2E] cursor-pointer h-2 bg-line rounded-lg"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    {[5, 10, 15, 20, 30, 40, 50]
                      .filter((n) => n <= maxAllowedCount)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuestionCount(val)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all",
                            questionCount === val
                              ? "bg-[#1A4D2E] text-white shadow-2xs"
                              : "bg-paper border border-line text-muted hover:text-ink"
                          )}
                        >
                          {val} Qs
                        </button>
                      ))}
                    {!([5, 10, 15, 20, 30, 40, 50].includes(maxAllowedCount)) && maxAllowedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuestionCount(maxAllowedCount)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all",
                          questionCount === maxAllowedCount
                            ? "bg-[#1A4D2E] text-white shadow-2xs"
                            : "bg-paper border border-line text-muted hover:text-ink"
                        )}
                      >
                        All ({maxAllowedCount})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Summary Card & Start Button */}
              <div className="rounded-2xl border border-[#1A4D2E]/20 bg-[#1A4D2E]/5 p-4 space-y-3 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#1A4D2E] uppercase tracking-wider text-[11px]">
                    Session Summary:
                  </span>
                  <span className="text-muted font-sans">
                    Estimated Time: ~{Math.round(questionCount * 1.5)} minutes
                  </span>
                </div>

                <div className="text-xs text-ink font-sans space-y-0.5">
                  <p>
                    <strong>Subject:</strong> {selectedSubject}
                  </p>
                  <p>
                    <strong>Year:</strong> {yearMode === "specific" ? selectedYear : `Mixed Practice (${availableYearsForSubject.join(", ")})`}
                  </p>
                  <p>
                    <strong>Sections:</strong> {selectedSection === "both" ? "Objective & Theory" : selectedSection === "objective" ? "Objective Only" : "Theory Only"}
                  </p>
                  <p>
                    <strong>Questions:</strong> {questionCount} questions ready to practice
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartPractice}
                  className="w-full py-3.5 rounded-full bg-[#1A4D2E] text-white font-serif font-bold text-base hover:bg-[#153e25] transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Start WAEC Practice</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ACTIVE CBT PRACTICE RUNNER                             */}
      {/* ========================================================= */}
      {sessionPhase === "active_test" && currentQ && (
        <div className="max-w-2xl mx-auto space-y-5 pb-12">
          {/* Top Header: Timer & Exit */}
          <div className="flex items-center justify-between text-xs border-b border-line pb-3">
            <div>
              <span className="font-serif font-bold text-sm text-ink">
                {selectedSubject} ({yearMode === "specific" ? selectedYear : "Mixed"})
              </span>
              <span className="text-muted ml-2">
                · {isCurrentTheory ? "Written Theory" : "Multiple Choice"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-3 py-1 rounded-full bg-paper border border-line text-ink">
                <Clock className="size-3.5 text-primary" />
                <span>{formatTime(elapsedSeconds)}</span>
              </span>

              <button
                type="button"
                onClick={() => setExitConfirmOpen(true)}
                className="text-muted hover:text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-line hover:border-red-300 hover:bg-red-50 transition-all flex items-center gap-1"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Question {currentIndex + 1} of {activeQuestions.length}</span>
              <span>{answeredCount} answered</span>
            </div>

            {/* Quick jump palette */}
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-paper/60 rounded-xl border border-line">
              {activeQuestions.map((q, idx) => {
                const isTh = "theory" in q && q.theory;
                const isAnswered = isTh ? Boolean(writtenAnswers[q.id]?.trim()) : Boolean(picks[q.id]);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "size-7 rounded-lg text-xs font-semibold transition-all flex items-center justify-center",
                      isCurrent
                        ? "bg-primary text-primary-fg ring-2 ring-primary/40 font-bold"
                        : isAnswered
                        ? "bg-[#1A4D2E] text-white"
                        : "bg-surface border border-line text-muted hover:text-ink"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Display */}
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-5 shadow-xs">
            {isCurrentTheory ? (
              /* Theory Question View with Diagram and Hierarchical subparts */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-serif font-bold text-sm text-[#1A4D2E]">
                    Theory Question {currentIndex + 1}
                  </span>
                  <span className="text-xs text-muted font-sans">
                    {(currentQ as any).marks ? `${(currentQ as any).marks} marks` : "Written response"}
                  </span>
                </div>

                <TheoryQuestionView
                  question={currentQ as TheoryQuestion}
                  index={currentIndex}
                  showAnswers={false}
                  studentAnswer={writtenAnswers[currentQ.id] || ""}
                  onStudentAnswerChange={(val) => {
                    setWrittenAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
                  }}
                />
              </div>
            ) : (
              /* Objective Question View */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-serif font-bold text-sm text-ink">
                    Question {currentIndex + 1}
                  </span>
                  <span className="text-xs text-muted">Multiple Choice</span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl text-ink leading-snug">
                  <InlineMathText text={currentQ.prompt} />
                </h2>

                {/* Options list */}
                <div className="space-y-2 pt-2">
                  {(currentQ as Question).options?.map((opt) => {
                    const selected = picks[currentQ.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setPicks((prev) => ({ ...prev, [currentQ.id]: opt.key as Choice }));
                        }}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                          selected
                            ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow-2xs"
                            : "border-line bg-paper hover:border-ink/50 text-ink"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                            selected ? "border-white/50 text-white" : "border-line text-muted"
                          )}
                        >
                          {opt.key}
                        </span>
                        <span className="text-xs sm:text-sm font-sans">
                          <InlineMathText text={opt.text} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink disabled:opacity-40"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-2">
                {currentIndex < activeQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="px-5 py-2 rounded-full bg-ink text-primary-fg text-xs font-semibold"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSubmitConfirmOpen(true)}
                    className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold shadow-xs hover:bg-[#153e25]"
                  >
                    Submit Paper
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Submit Confirmation Modal */}
          {submitConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Send className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-ink">Submit Examination Paper?</h3>
                    <p className="text-xs text-muted">
                      You have answered <strong>{answeredCount}</strong> of <strong>{activeQuestions.length}</strong> questions.
                      {answeredCount < activeQuestions.length && (
                        <span className="text-amber-700 block mt-0.5">
                          ⚠️ {activeQuestions.length - answeredCount} question(s) remain unanswered.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmitConfirmOpen(false)}
                    className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink"
                  >
                    Keep Practicing
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitTest}
                    className="px-5 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
                  >
                    Confirm & Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Exit Warning Modal */}
          {exitConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-surface p-6 shadow-xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="size-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="size-6 text-rose-600" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-lg text-ink">
                      Exit Practice Session?
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-sans">
                      Are you sure you want to quit this practice test? Your current progress and <strong>{answeredCount} answered question(s)</strong> will not be saved.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setExitConfirmOpen(false)}
                    className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-ink hover:bg-paper transition-colors"
                  >
                    Continue Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExitConfirmOpen(false);
                      setSessionPhase("config");
                    }}
                    className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
                  >
                    Exit Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. RESULTS & REVIEW ATTEMPT SCREEN                        */}
      {/* ========================================================= */}
      {sessionPhase === "results" && (
        <div className="max-w-3xl mx-auto space-y-6 py-6">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6 shadow-xs text-center">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1A4D2E]/10 text-[#1A4D2E] uppercase tracking-wider">
              Examination Complete
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl text-ink font-bold">
              {finalObjTotal > 0
                ? `${finalScore} / ${finalObjTotal} Objective Score`
                : "Written Theory Assessment Submitted"}
            </h1>

            <p className="text-xs sm:text-sm text-muted font-sans max-w-md mx-auto">
              Your paper submission has been recorded. Objective questions were graded against official keys; written theory responses have been evaluated by the AI WAEC Examiner.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center pt-2">
              <div className="p-3.5 rounded-2xl bg-paper border border-line">
                <span className="text-xs text-muted block">Objective Score</span>
                <strong className="text-xl font-bold text-ink">
                  {finalObjTotal > 0 ? `${Math.round((finalScore / finalObjTotal) * 100)}%` : "N/A"}
                </strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-paper border border-line">
                <span className="text-xs text-muted block">Time Taken</span>
                <strong className="text-xl font-bold text-[#1A4D2E]">{formatTime(elapsedSeconds)}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-paper border border-line col-span-2 sm:col-span-1">
                <span className="text-xs text-muted block">Theory Assessment</span>
                <strong className="text-xl font-bold text-ink">
                  {theoryMarkingResult
                    ? `${theoryMarkingResult.totalMarksAwarded}/${theoryMarkingResult.totalMaxMarks} Marks`
                    : `${finalTheoryTotal} items`}
                </strong>
              </div>
            </div>

            {/* Examiner's Marking Sheet Section */}
            {isMarkingTheory ? (
              <div className="rounded-2xl border border-emerald-200 bg-[#F0FDF4] p-8 text-center space-y-3">
                <div className="size-8 border-3 border-[#1A4D2E] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-emerald-900 font-bold font-sans">
                  AI WAEC Examiner is parsing and marking your written theory responses...
                </p>
              </div>
            ) : theoryMarkingResult && theoryMarkingResult.results?.length > 0 ? (
              <div className="text-left rounded-3xl border border-emerald-200/80 bg-[#FCFAF7] p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2">
                    <PenTool className="size-5 text-[#1A4D2E]" />
                    <h2 className="font-serif text-xl font-bold text-[#1A4D2E]">
                      Examiner's Marking Sheet
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#1A4D2E] text-white text-xs font-bold">
                      Theory Score: {theoryMarkingResult.totalMarksAwarded} / {theoryMarkingResult.totalMaxMarks} Marks
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                      {Math.round((theoryMarkingResult.totalMarksAwarded / (theoryMarkingResult.totalMaxMarks || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1A4D2E] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((theoryMarkingResult.totalMarksAwarded / (theoryMarkingResult.totalMaxMarks || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Graded Sub-questions List */}
                <div className="space-y-4 pt-2">
                  {theoryMarkingResult.results.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-serif font-bold text-sm text-[#1A4D2E]">
                          {item.questionLabel || `Question ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            [{item.marksAwarded} / {item.maxMarks} Marks]
                          </span>
                          {item.needsReview && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle className="size-3 text-amber-600" />
                              Needs Review
                            </span>
                          )}
                        </div>
                      </div>

                      {item.questionText && (
                        <p className="text-xs font-medium text-stone-700 leading-snug">
                          {item.questionText}
                        </p>
                      )}

                      {/* Parsed Student Answer Box */}
                      <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-3 space-y-1">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          Student Answer Parsed by AI Examiner:
                        </span>
                        <p className="text-xs text-stone-800 font-mono leading-relaxed whitespace-pre-wrap">
                          {item.studentAnswerParsed || "No response snippet attributed."}
                        </p>
                      </div>

                      {/* Examiner Feedback Box */}
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <PenTool className="size-3.5 text-emerald-700" />
                          Examiner's Feedback & Marking Scheme Notes:
                        </span>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                          {item.feedback || "Graded according to official WAEC marking criteria."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-line">
              {completedAttemptId && (
                <Link
                  to="/studio/review/$attemptId"
                  params={{ attemptId: completedAttemptId }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1A4D2E] text-white font-serif font-bold text-sm hover:bg-[#153e25] shadow-xs transition-colors"
                >
                  <Sparkles className="size-4" />
                  <span>Review Attempt & AI Learning Analysis →</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSessionPhase("config")}
                className="w-full sm:w-auto px-5 py-3 rounded-full border border-line text-xs font-semibold text-ink hover:border-primary"
              >
                Practice Another Paper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
