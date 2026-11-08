import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Choice } from "@/data/catalog";
import { scoreObjective } from "@/lib/assessment";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import {
  useCbtStore,
  getExamLifecycleState,
  formatLagosDateTime,
  assembleStudentPaper,
  JAMB_SUBJECT_LABELS,
  JAMB_SECTION_TARGETS,
  type JambSectionSubject,
  type AdminJambExam,
  type QuestionBankItem,
} from "@/lib/cbt-store";
import { calculateUtmeScore, getAttemptUtmeResult } from "@/lib/utme-scoring";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  ArrowLeft,
  Calendar,
  Lock,
  PenLine,
  Flag,
  ChevronRight,
  ChevronLeft,
  Layers,
  FileText,
  HelpCircle,
  Sparkles,
  Grid,
  BarChart2,
  X,
  User,
  BookOpen,
} from "lucide-react";

interface JambExamHallProps {
  examId: string;
  examType: "weekly_jamb" | "full_jamb_mock";
  titleOverride?: string;
  backRoute?: string;
}

function formatHHMMSS(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function JambExamHall({
  examId,
  examType,
  titleOverride,
  backRoute = "/studio/cbt",
}: JambExamHallProps) {
  const weeklyExams = useCbtStore((s) => s.weeklyExams);
  const adminExams = useCbtStore((s) => s.adminExams);
  const record = useSession((s) => s.record);
  const attempts = useSession((s) => s.attempts);
  const jambSubjects = useSession((s) => s.jambSubjects);
  const email = useSession((s) => s.email);
  const name = useSession((s) => s.name);
  const navigate = useNavigate();

  const studentName = name || (email ? email.split("@")[0] : "Candidate");
  const studentKey = email ? encodeURIComponent(email) : "student";

  // Resolve source exam record
  const adminExam = useMemo(
    () => adminExams.find((e) => e.id === examId) || null,
    [adminExams, examId]
  );
  const weeklyExamFromStore = useMemo(
    () => weeklyExams.find((e) => e.id === examId) || null,
    [weeklyExams, examId]
  );

  const exam = useMemo(() => {
    if (adminExam) {
      const sec = adminExam.sections || ({} as any);
      const flattened = [
        ...(sec.english || []),
        ...(sec.mathematics || []),
        ...(sec.physics || []),
        ...(sec.chemistry || []),
        ...(sec.biology || []),
      ];
      return {
        id: adminExam.id,
        title: titleOverride || adminExam.title,
        description: adminExam.instructions,
        subject: "5-Subject JAMB Master",
        questionIds: flattened.map((q) => q.id),
        questions: flattened,
        durationMinutes: adminExam.durationMinutes || 120,
        startAt: adminExam.startAt,
        endAt: adminExam.endAt,
        status: adminExam.status as any,
        createdAt: adminExam.createdAt,
        sections: adminExam.sections,
      };
    }
    if (weeklyExamFromStore) {
      return {
        ...weeklyExamFromStore,
        title: titleOverride || weeklyExamFromStore.title,
      };
    }
    // Fallback virtual exam if not found
    return {
      id: examId,
      title: titleOverride || (examType === "full_jamb_mock" ? "Full JAMB UTME National Mock" : "Weekly JAMB CBT Examination"),
      description: "Official 180-question 4-subject UTME examination simulation. Strictly timed for 120 minutes with comprehensive question verification.",
      subject: "5-Subject JAMB Master",
      questionIds: [],
      questions: [],
      durationMinutes: 120,
      startAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      endAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      status: "published",
      createdAt: new Date().toISOString(),
    };
  }, [adminExam, weeklyExamFromStore, examId, titleOverride, examType]);

  // Check if student already completed this exam
  const existingAttempt = useMemo(() => {
    if (!exam) return null;
    return attempts.find((a) => a.topicId === exam.id || a.paperId === exam.id);
  }, [exam, attempts]);

  const storagePicksKey = `richmirabel_${examType}_picks_${studentKey}_${examId}`;
  const storageTimeKey = `richmirabel_${examType}_ends_at_${studentKey}_${examId}`;
  const storageActiveKey = `richmirabel_${examType}_active_${studentKey}_${examId}`;

  // Restore in-progress attempt state
  const [started, setStarted] = useState(() => {
    try {
      const active =
        localStorage.getItem(storageActiveKey) === "true" ||
        localStorage.getItem(`richmirabel_${examType}_active_${examId}`) === "true";
      const storedEndsAt = Number(
        localStorage.getItem(storageTimeKey) ||
          localStorage.getItem(`richmirabel_${examType}_ends_at_${examId}`)
      );
      return active && !isNaN(storedEndsAt) && storedEndsAt > Date.now();
    } catch {
      return false;
    }
  });

  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [activeSubjectTab, setActiveSubjectTab] = useState<JambSectionSubject>("english");
  const [paletteView, setPaletteView] = useState<"subject" | "all">("subject");
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const [picks, setPicks] = useState<Record<string, Choice>>(() => {
    try {
      const saved =
        localStorage.getItem(storagePicksKey) ||
        localStorage.getItem(`richmirabel_${examType}_picks_${examId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const durationSec = (exam?.durationMinutes || 120) * 60;
  const [left, setLeft] = useState(durationSec);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const submitted = useRef(false);
  const endsAt = useRef<number | null>(null);

  // Student's 3 elective subjects (default to physics, chemistry, biology/mathematics)
  const studentElectives = useMemo(() => {
    if (Array.isArray(jambSubjects) && jambSubjects.length === 3) {
      return jambSubjects.map((s) => s.toLowerCase());
    }
    return ["physics", "chemistry", "biology"];
  }, [jambSubjects]);

  const candidateSubjects = useMemo(() => {
    return ["english", ...studentElectives] as JambSectionSubject[];
  }, [studentElectives]);

  // Assemble full 180-question student paper (English 60 + 3 electives 40 each = 180 questions)
  const questions = useMemo(() => {
    return assembleStudentPaper(adminExam || undefined, studentElectives);
  }, [adminExam, studentElectives]);

  // Group assembled questions by subject for tabs & navigation
  const subjectGroups = useMemo(() => {
    const groups: Record<string, typeof questions> = {};
    for (const sub of candidateSubjects) {
      groups[sub] = questions.filter((q) => q.subjectId.toLowerCase() === sub.toLowerCase());
    }
    return groups;
  }, [questions, candidateSubjects]);

  // Sync picks to local storage
  useEffect(() => {
    if (started && !done) {
      try {
        localStorage.setItem(storagePicksKey, JSON.stringify(picks));
      } catch {}
    }
  }, [picks, started, done, storagePicksKey]);

  const { score, total } = useMemo(() => scoreObjective(questions as any, picks), [questions, picks]);
  const lifecycle = exam ? getExamLifecycleState(exam.startAt, exam.endAt, exam.status) : "closed";

  // Persistent Timestamp-Based Timer
  useEffect(() => {
    if (!started || done) return;

    let savedEndsAt = null;
    try {
      const stored =
        localStorage.getItem(storageTimeKey) ||
        localStorage.getItem(`richmirabel_${examType}_ends_at_${examId}`);
      if (stored) savedEndsAt = Number(stored);
    } catch {}

    if (!savedEndsAt || isNaN(savedEndsAt) || savedEndsAt <= Date.now()) {
      endsAt.current = Date.now() + durationSec * 1000;
      try {
        localStorage.setItem(storageTimeKey, String(endsAt.current));
      } catch {}
    } else {
      endsAt.current = savedEndsAt;
    }

    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt.current! - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0) {
        submit();
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [started, done, durationSec, storageTimeKey, examId, examType]);

  const submit = () => {
    if (submitted.current || !exam) return;
    submitted.current = true;

    try {
      localStorage.removeItem(storageActiveKey);
      localStorage.removeItem(`richmirabel_${examType}_active_${examId}`);
      localStorage.removeItem(storagePicksKey);
      localStorage.removeItem(`richmirabel_${examType}_picks_${examId}`);
      localStorage.removeItem(storageTimeKey);
      localStorage.removeItem(`richmirabel_${examType}_ends_at_${examId}`);
    } catch {}

    const items = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      explain: q.explanation,
      pick: picks[q.id],
      subjectId: q.subjectId || "general",
      subject: q.subject || "General",
    }));

    const utmeResult = calculateUtmeScore(questions, picks);

    const id = record({
      topicId: exam.id,
      title: exam.title,
      score: utmeResult.rawCorrect,
      total: utmeResult.rawTotal,
      utmeScore: utmeResult.utmeScore,
      exactUtmeScore: utmeResult.exactUtmeScore,
      subjectScores: utmeResult.subjectBreakdown,
      kind: "jamb",
      demo: false,
      picks,
      items: items as any,
      paperId: exam.id,
      subjectLabel: examType === "full_jamb_mock" ? "Full JAMB UTME Simulation" : "Weekly JAMB CBT Examination",
    });

    setAttemptId(id);
    setDone(true);
    setSubmitConfirmOpen(false);
  };

  // State A: Completed Attempt Screen
  if (existingAttempt && !started && !done) {
    const utmeResult = getAttemptUtmeResult(existingAttempt);

    return (
      <div className="mx-auto max-w-2xl py-8 space-y-6 font-sans">
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E]">
          <ArrowLeft className="size-4" /> Back to CBT Hub
        </Link>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 text-center">
          <div className="size-16 rounded-full bg-emerald-100 text-[#1A4D2E] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="size-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              Attempt Submitted & Graded
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-2">
              {utmeResult.utmeScore} / 400
            </h1>
            <p className="text-xs font-semibold text-[#1A4D2E] mt-1 font-sans">
              Official JAMB-Equivalent Score ({utmeResult.percentage}% Overall)
            </p>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              {exam.title} · Recorded {new Date(existingAttempt.at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase">UTME Score</span>
              <p className="font-serif text-2xl font-bold text-[#1A4D2E] mt-0.5">{utmeResult.utmeScore} / 400</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Accuracy</span>
              <p className="font-serif text-2xl font-bold text-emerald-800 mt-0.5">
                {utmeResult.accuracy}%
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Raw Correct</span>
              <p className="font-serif text-2xl font-bold text-stone-900 mt-0.5">{utmeResult.rawCorrect} / {utmeResult.rawTotal}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Unanswered</span>
              <p className="font-serif text-2xl font-bold text-stone-900 mt-0.5">{utmeResult.rawUnanswered}</p>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          {Object.keys(utmeResult.subjectBreakdown).length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden text-left text-xs font-sans shadow-2xs">
              <div className="bg-stone-50 p-3 border-b border-stone-200 font-bold text-stone-800 uppercase text-[10px] tracking-wider">
                Subject UTME Breakdown (100 Marks Max Per Subject):
              </div>
              <table className="w-full text-left">
                <thead className="bg-stone-50/50 text-stone-500 text-[10px] uppercase font-bold border-b border-stone-100">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">Correct</th>
                    <th className="px-4 py-2">Questions</th>
                    <th className="px-4 py-2 text-right">UTME Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Object.values(utmeResult.subjectBreakdown).map((sb) => (
                    <tr key={sb.subjectId}>
                      <td className="px-4 py-2.5 font-bold text-stone-900">{sb.subjectLabel}</td>
                      <td className="px-4 py-2.5 font-mono text-stone-800">{sb.correct}</td>
                      <td className="px-4 py-2.5 font-mono text-stone-500">{sb.total}</td>
                      <td className="px-4 py-2.5 font-bold font-mono text-[#1A4D2E] text-right">{sb.utmeScore} / 100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-center flex-wrap gap-3 pt-2">
            <Link
              to="/studio/review/$attemptId"
              params={{ attemptId: existingAttempt.id }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-7 text-xs font-bold text-white hover:bg-[#153e25] shadow-xs"
            >
              <Sparkles className="size-4" /> Review Attempt & AI Diagnostics →
            </Link>
            <button
              type="button"
              onClick={() => {
                setPicks({});
                try {
                  localStorage.removeItem(storagePicksKey);
                  localStorage.removeItem(storageTimeKey);
                  localStorage.removeItem(storageActiveKey);
                } catch {}
                endsAt.current = Date.now() + durationSec * 1000;
                try {
                  localStorage.setItem(storageTimeKey, String(endsAt.current));
                  localStorage.setItem(storageActiveKey, "true");
                } catch {}
                setLeft(durationSec);
                setIndex(0);
                submitted.current = false;
                setStarted(true);
              }}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white px-5 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              <PenLine className="size-4 text-[#1A4D2E]" />
              <span>Retake Exam (Test Mode)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State B: Pre-Test Instructions Screen
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl py-6 space-y-6 font-sans">
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4D2E]">
          <ArrowLeft className="size-4" /> Back to CBT Hub
        </Link>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-9 shadow-xs space-y-7">
          <div className="flex items-start justify-between flex-wrap gap-3 border-b border-stone-100 pb-5">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <Trophy className="size-3.5" />
                {examType === "full_jamb_mock" ? "Full JAMB UTME Official Mock" : "Weekly JAMB CBT Sprint"}
              </span>
              <h1 className="font-serif text-3xl font-bold text-stone-900 pt-1">{exam.title}</h1>
              <p className="text-xs sm:text-sm text-stone-600 font-sans leading-relaxed">{exam.description}</p>
            </div>
          </div>

          {/* Candidate & Verification Info */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
              <span className="text-stone-500 font-bold uppercase text-[10px] tracking-wider block">Candidate Profile</span>
              <div className="flex items-center gap-2">
                <User className="size-4 text-[#1A4D2E]" />
                <span className="font-bold text-stone-900 text-sm">{studentName}</span>
              </div>
              <p className="text-stone-500">{email || "Verified Candidate Session"}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
              <span className="text-stone-500 font-bold uppercase text-[10px] tracking-wider block">Examination Rules</span>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[#1A4D2E]" />
                <span className="font-bold text-stone-900 text-sm">{Math.round(durationSec / 60)} Minutes (Strict Timed)</span>
              </div>
              <p className="text-stone-500">180 Questions across 4 registered papers</p>
            </div>
          </div>

          {/* Verified Candidate Subject Combination */}
          <div className="rounded-2xl border border-stone-200 bg-[#FCFAF7] p-5 space-y-3 font-sans">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <BookOpen className="size-4 text-[#1A4D2E]" /> Assigned 4-Subject Combination
              </span>
              <Link to="/studio/account" className="text-[#1A4D2E] font-bold text-xs hover:underline">
                Change electives
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {candidateSubjects.map((subKey, i) => (
                <div key={subKey} className="rounded-xl border border-stone-200 bg-white p-3 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-400 uppercase block">
                    {i === 0 ? "Compulsory" : `Elective ${i}`}
                  </span>
                  <p className="font-bold text-stone-900 text-xs truncate">
                    {JAMB_SUBJECT_LABELS[subKey]}
                  </p>
                  <span className="text-[11px] text-stone-500 font-mono block">
                    {JAMB_SECTION_TARGETS[subKey]} Qs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          <div className="space-y-2.5 text-xs text-stone-600 font-sans border-t border-stone-100 pt-4">
            <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">Examination Hall Regulations:</h4>
            <ul className="grid sm:grid-cols-2 gap-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-[#1A4D2E] shrink-0 mt-0.5" />
                <span>Timer begins immediately when you click <strong>Begin Examination</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-[#1A4D2E] shrink-0 mt-0.5" />
                <span>Use the <strong>Subject Tabs</strong> to move between your 4 registered subjects.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-[#1A4D2E] shrink-0 mt-0.5" />
                <span>Use the <strong>Question Palette</strong> to jump directly to any question number.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-[#1A4D2E] shrink-0 mt-0.5" />
                <span>Unanswered questions will be automatically scored 0 upon timer expiry.</span>
              </li>
            </ul>
          </div>

          {/* Action Trigger */}
          {getExamLifecycleState(exam.startAt, exam.endAt, exam.status) === "coming_soon" ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-blue-900 font-bold text-sm">
                <Lock className="size-5 text-blue-600" />
                <span>Examination Window Locked</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed max-w-md mx-auto font-sans">
                This examination is scheduled for release on{" "}
                <strong>{formatLagosDateTime(exam.startAt)}</strong>. In accordance with examination regulations, questions cannot be accessed prior to the scheduled start time.
              </p>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-blue-200 text-blue-950 font-mono font-bold text-xs shadow-2xs">
                <Clock className="size-3.5 text-blue-600" />
                <span>Opens: {formatLagosDateTime(exam.startAt)}</span>
              </div>
            </div>
          ) : getExamLifecycleState(exam.startAt, exam.endAt, exam.status) === "closed" ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-stone-800 font-bold text-sm">
                <Lock className="size-5 text-stone-500" />
                <span>Examination Window Closed</span>
              </div>
              <p className="text-xs text-stone-600 font-sans">
                The scheduled examination window closed on {formatLagosDateTime(exam.endAt)}.
              </p>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  endsAt.current = Date.now() + durationSec * 1000;
                  try {
                    localStorage.setItem(storageTimeKey, String(endsAt.current));
                    localStorage.setItem(storageActiveKey, "true");
                  } catch {}
                  setLeft(durationSec);
                  setStarted(true);
                }}
                className="w-full min-h-14 rounded-full bg-[#1A4D2E] text-white font-bold text-base hover:bg-[#153e25] transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <PenLine className="size-5" />
                <span>Begin Examination Now (180 Questions · 120 Mins) →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // State C: Submitted Screen
  if (done) {
    const utmeResult = calculateUtmeScore(questions, picks);

    return (
      <div className="mx-auto max-w-2xl py-8 space-y-6 font-sans">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-9 shadow-xs text-center space-y-6">
          <div className="size-16 rounded-full bg-emerald-100 text-[#1A4D2E] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="size-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A4D2E]">
              Official JAMB CBT Submission Confirmed
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900">{utmeResult.utmeScore} / 400</h1>
            <p className="text-sm font-semibold text-stone-700 pt-0.5">
              JAMB Practice Score ({utmeResult.percentage}% Overall)
            </p>
            <p className="text-xs text-stone-600 font-sans max-w-md mx-auto pt-1">
              Your paper has been scored against official verified JAMB answer keys with diagnostic AI review.
            </p>
          </div>

          {/* Performance Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase">UTME Score</span>
              <p className="font-serif text-xl font-bold text-[#1A4D2E] mt-0.5">{utmeResult.utmeScore} / 400</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase">Accuracy</span>
              <p className="font-serif text-xl font-bold text-emerald-800 mt-0.5">{utmeResult.accuracy}%</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase">Raw Correct</span>
              <p className="font-serif text-xl font-bold text-stone-900 mt-0.5">{utmeResult.rawCorrect} / 180</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase">Unanswered</span>
              <p className="font-serif text-xl font-bold text-stone-900 mt-0.5">{utmeResult.rawUnanswered}</p>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          {Object.keys(utmeResult.subjectBreakdown).length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden text-left text-xs font-sans shadow-2xs">
              <div className="bg-stone-50 p-3 border-b border-stone-200 font-bold text-stone-800 uppercase text-[10px] tracking-wider">
                Subject UTME Breakdown (100 Marks Max Per Subject):
              </div>
              <table className="w-full text-left">
                <thead className="bg-stone-50/50 text-stone-500 text-[10px] uppercase font-bold border-b border-stone-100">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">Correct</th>
                    <th className="px-4 py-2">Questions</th>
                    <th className="px-4 py-2 text-right">UTME Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Object.values(utmeResult.subjectBreakdown).map((sb) => (
                    <tr key={sb.subjectId}>
                      <td className="px-4 py-2.5 font-bold text-stone-900">{sb.subjectLabel}</td>
                      <td className="px-4 py-2.5 font-mono text-stone-800">{sb.correct}</td>
                      <td className="px-4 py-2.5 font-mono text-stone-500">{sb.total}</td>
                      <td className="px-4 py-2.5 font-bold font-mono text-[#1A4D2E] text-right">{sb.utmeScore} / 100</td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50/70 font-bold">
                    <td className="px-4 py-2.5 text-stone-900">TOTAL</td>
                    <td className="px-4 py-2.5 font-mono text-stone-900">{utmeResult.rawCorrect}</td>
                    <td className="px-4 py-2.5 font-mono text-stone-500">{utmeResult.rawTotal}</td>
                    <td className="px-4 py-2.5 font-mono text-[#1A4D2E] text-right">{utmeResult.utmeScore} / 400</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/studio/progress"
              className="inline-flex min-h-12 items-center rounded-full border border-stone-300 bg-white px-6 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              View Student Progress
            </Link>
            {attemptId && (
              <Link
                to="/studio/review/$attemptId"
                params={{ attemptId }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-8 text-xs font-bold text-white hover:bg-[#153e25] shadow-xs"
              >
                <Sparkles className="size-4" /> Review Attempt AI Diagnostics →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Question item
  const currentQuestion = questions[index];
  if (!currentQuestion) return null;

  const currentSubjectKey = (currentQuestion.subjectId || "english").toLowerCase() as JambSectionSubject;
  const currentSubjectGroup = subjectGroups[currentSubjectKey] || [];
  const questionIndexInSubject = currentSubjectGroup.findIndex((item) => item.id === currentQuestion.id);

  return (
    <div className="mx-auto max-w-6xl pb-12 font-sans space-y-4">
      {/* ========================================================================= */}
      {/* 1. PERSISTENT EXAMINATION HALL HEADER                                    */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 rounded-2xl border border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#1A4D2E] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            RM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-stone-900 text-sm sm:text-base leading-none">
                {exam.title}
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                Official CBT
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-sans mt-0.5">
              Candidate: <strong className="text-stone-800 font-semibold">{studentName}</strong> · 180 Questions Total
            </p>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Countdown Timer */}
          <div
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 border transition-all",
              left < 300
                ? "bg-rose-100 text-rose-900 border-rose-300 animate-pulse"
                : "bg-emerald-50 text-emerald-950 border-emerald-200"
            )}
          >
            <Clock className={cn("size-4", left < 300 ? "text-rose-600" : "text-emerald-700")} />
            <span>{formatHHMMSS(left)}</span>
          </div>

          <button
            type="button"
            onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
            className="lg:hidden p-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1"
          >
            <Grid className="size-4 text-[#1A4D2E]" />
            <span className="hidden xs:inline">Palette</span>
          </button>

          <button
            type="button"
            onClick={() => setExitConfirmOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
          >
            Exit
          </button>

          <button
            type="button"
            onClick={() => setSubmitConfirmOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] transition-colors shadow-2xs"
          >
            Submit Paper
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SUBJECT NAVIGATION TABS BAR                                           */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 font-sans">
        <div className="flex items-center gap-2 shrink-0">
          {candidateSubjects.map((subKey) => {
            const group = subjectGroups[subKey] || [];
            const answeredInGroup = group.filter((item) => picks[item.id]).length;
            const isActive = activeSubjectTab === subKey;
            const label = JAMB_SUBJECT_LABELS[subKey as JambSectionSubject] || subKey;

            return (
              <button
                key={subKey}
                type="button"
                onClick={() => {
                  setActiveSubjectTab(subKey as JambSectionSubject);
                  const firstIdxInSub = questions.findIndex((item) => item.subjectId.toLowerCase() === subKey);
                  if (firstIdxInSub >= 0) setIndex(firstIdxInSub);
                }}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 flex items-center gap-2 shadow-2xs",
                  isActive
                    ? "bg-[#1A4D2E] text-white border-[#1A4D2E]"
                    : "bg-white text-stone-800 border-stone-200 hover:border-stone-400"
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono",
                    isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                  )}
                >
                  {answeredInGroup}/{group.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 font-sans shrink-0">
          <span>Total Answered:</span>
          <strong className="font-mono text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
            {Object.keys(picks).length} / {questions.length}
          </strong>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN EXAMINATION HALL GRID (QUESTION + PALETTE)                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: QUESTION DISPLAY AREA */}
        <main className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            {/* Question Header Metadata */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 flex-wrap gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1A4D2E] text-xs uppercase tracking-wider">
                    {JAMB_SUBJECT_LABELS[currentSubjectKey]} Section
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs text-stone-500">
                    Question {questionIndexInSubject + 1} of {currentSubjectGroup.length}
                  </span>
                </div>
                <h3 className="font-mono font-bold text-stone-900 text-sm">
                  Overall Question {index + 1} of {questions.length}
                </h3>
              </div>

              {/* Flag Indicator */}
              <button
                type="button"
                onClick={() =>
                  setFlagged((f) => {
                    const n = new Set(f);
                    if (n.has(currentQuestion.id)) n.delete(currentQuestion.id);
                    else n.add(currentQuestion.id);
                    return n;
                  })
                }
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all",
                  flagged.has(currentQuestion.id)
                    ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                )}
              >
                <Flag className={cn("size-3.5", flagged.has(currentQuestion.id) && "fill-amber-600 text-amber-600")} />
                <span>{flagged.has(currentQuestion.id) ? "Flagged for Review" : "Flag Question"}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="font-serif text-base sm:text-lg text-stone-900 leading-relaxed pt-1">
              <InlineMathText text={currentQuestion.prompt} />
            </div>

            {/* Answer Choices A - D */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options?.map((opt) => {
                const selected = picks[currentQuestion.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPicks((p) => ({ ...p, [currentQuestion.id]: opt.key }))}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all text-sm font-medium group",
                      selected
                        ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow-xs"
                        : "border-stone-200 bg-stone-50/60 text-stone-800 hover:bg-stone-100/80 hover:border-stone-300"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl text-xs font-bold border shrink-0 transition-colors",
                        selected
                          ? "border-white/40 bg-white/20 text-white"
                          : "border-stone-200 bg-white text-stone-700 group-hover:border-stone-400"
                      )}
                    >
                      {opt.key}
                    </span>
                    <span className="flex-1 leading-snug">
                      <InlineMathText text={opt.text} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Bar Footer */}
            <div className="flex items-center justify-between gap-3 pt-5 border-t border-stone-100">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const prevIdx = index - 1;
                  setIndex(prevIdx);
                  if (questions[prevIdx]?.subjectId) {
                    setActiveSubjectTab(questions[prevIdx].subjectId as JambSectionSubject);
                  }
                }}
                className="min-h-11 rounded-full border border-stone-200 px-5 text-xs font-bold text-stone-700 disabled:opacity-30 hover:bg-stone-50 flex items-center gap-1.5"
              >
                <ChevronLeft className="size-4" /> Previous
              </button>

              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = index + 1;
                    setIndex(nextIdx);
                    if (questions[nextIdx]?.subjectId) {
                      setActiveSubjectTab(questions[nextIdx].subjectId as JambSectionSubject);
                    }
                  }}
                  className="min-h-11 rounded-full bg-[#1A4D2E] px-6 sm:px-7 text-xs font-bold text-white hover:bg-[#153e25] transition-colors shadow-xs flex items-center gap-1.5"
                >
                  Next Question <ChevronRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitConfirmOpen(true)}
                  className="min-h-11 rounded-full bg-[#1A4D2E] px-6 sm:px-7 text-xs font-bold text-white hover:bg-[#153e25] transition-colors shadow-xs flex items-center gap-1.5"
                >
                  Submit Final Paper <CheckCircle2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT: QUESTION NAVIGATION PALETTE (DESKTOP & RESPONSIVE DRAWER) */}
        <aside
          className={cn(
            "lg:col-span-4 space-y-4 font-sans transition-all",
            mobilePaletteOpen
              ? "fixed inset-x-0 bottom-0 z-40 bg-white p-4 rounded-t-3xl border-t border-stone-300 shadow-2xl max-h-[80vh] overflow-y-auto"
              : "hidden lg:block"
          )}
        >
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="size-4 text-[#1A4D2E]" />
                <h3 className="font-serif font-bold text-stone-900 text-sm">Question Palette</h3>
              </div>

              {mobilePaletteOpen && (
                <button
                  type="button"
                  onClick={() => setMobilePaletteOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-700"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle: Active Subject vs All 180 Qs */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaletteView("subject")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg transition-all text-center",
                  paletteView === "subject" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-600 hover:text-stone-900"
                )}
              >
                {JAMB_SUBJECT_LABELS[currentSubjectKey]} ({currentSubjectGroup.length})
              </button>
              <button
                type="button"
                onClick={() => setPaletteView("all")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg transition-all text-center",
                  paletteView === "all" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-600 hover:text-stone-900"
                )}
              >
                All 180 Questions
              </button>
            </div>

            {/* Color Legend */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 font-sans border-b border-stone-100 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-[#1A4D2E]" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-stone-100 border border-stone-300" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-amber-100 border border-amber-400" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-[#1A4D2E] ring-2 ring-amber-400" />
                <span>Answered & Flagged</span>
              </div>
            </div>

            {/* Palette Grid Matrix */}
            <div className="max-h-80 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5">
                {questions.map((item, i) => {
                  if (paletteView === "subject" && item.subjectId.toLowerCase() !== currentSubjectKey) {
                    return null;
                  }

                  const isCurrent = i === index;
                  const isAnswered = !!picks[item.id];
                  const isFlagged = flagged.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        if (item.subjectId) {
                          setActiveSubjectTab(item.subjectId as JambSectionSubject);
                        }
                        if (mobilePaletteOpen) setMobilePaletteOpen(false);
                      }}
                      className={cn(
                        "size-8 rounded-xl text-xs font-bold transition-all relative font-mono flex items-center justify-center",
                        isCurrent && "ring-2 ring-offset-1 ring-stone-900 scale-105 z-10",
                        isAnswered
                          ? "bg-[#1A4D2E] text-white shadow-2xs"
                          : "bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-400",
                        isFlagged && "ring-2 ring-amber-500"
                      )}
                    >
                      <span>{i + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 4. SUBMIT CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="size-12 rounded-2xl bg-emerald-100 text-[#1A4D2E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-2xl font-bold text-stone-900">Submit Examination?</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans max-w-sm mx-auto">
                Are you ready to finalize and submit your UTME paper for official score recording?
              </p>
            </div>

            {/* Breakdown Table by Subject */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-3 text-xs">
              <span className="font-bold text-stone-700 uppercase tracking-wider text-[10px] block">
                Paper Answer Completion Breakdown:
              </span>
              <div className="space-y-1.5">
                {candidateSubjects.map((subKey) => {
                  const grp = subjectGroups[subKey] || [];
                  const ansCount = grp.filter((item) => picks[item.id]).length;
                  return (
                    <div key={subKey} className="flex justify-between items-center text-stone-800">
                      <span>{JAMB_SUBJECT_LABELS[subKey]}</span>
                      <strong className="font-mono">
                        {ansCount} / {grp.length} Qs
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-stone-200 pt-2.5 flex justify-between items-center font-bold text-stone-900">
                <span>Total Answered (All 4 Subjects):</span>
                <span className="font-mono text-emerald-800 text-sm">
                  {Object.keys(picks).length} of {questions.length} Qs
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSubmitConfirmOpen(false)}
                className="flex-1 min-h-12 rounded-full border border-stone-200 text-xs font-bold text-stone-800 hover:bg-stone-50"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitConfirmOpen(false);
                  submit();
                }}
                className="flex-1 min-h-12 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] shadow-xs"
              >
                Yes, Submit Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EXIT WARNING MODAL                                                     */}
      {/* ========================================================================= */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl space-y-4">
            <div className="size-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif text-xl font-bold text-stone-900">Exit Examination Hall?</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Exiting without submitting will not record your final paper score. Are you sure you want to exit?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="flex-1 min-h-11 rounded-full border border-stone-200 text-xs font-bold text-stone-800"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(storagePicksKey);
                    localStorage.removeItem(storageTimeKey);
                    localStorage.removeItem(storageActiveKey);
                  } catch {}
                  navigate({ to: backRoute });
                }}
                className="flex-1 min-h-11 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
