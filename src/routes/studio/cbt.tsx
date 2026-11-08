import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import {
  PenLine,
  Clock,
  Calendar,
  ChevronRight,
  Lock,
  CheckCircle2,
  Trophy,
  History,
  BarChart3,
  Layers,
  BookOpen,
  ArrowRight,
  Award,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useSession } from "@/lib/session";
import {
  useCbtStore,
  getExamLifecycleState,
  formatLagosDateTime,
  isExamPublishedOrAvailable,
  JAMB_SUBJECT_LABELS,
  type JambSectionSubject,
  type AdminJambExam,
} from "@/lib/cbt-store";
import { getAttemptUtmeResult } from "@/lib/utme-scoring";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/studio/cbt")({ component: CbtLayout });

function CbtLayout() {
  const matchWeekly = useMatch({ from: "/studio/cbt/weekly/$examId", shouldThrow: false });
  const matchJamb = useMatch({ from: "/studio/cbt/jamb", shouldThrow: false });

  if (matchWeekly || matchJamb) {
    return <Outlet />;
  }

  return <CbtPage />;
}

function CbtPage() {
  const jamb = useSession((s) => s.jambSubjects);
  const attempts = useSession((s) => s.attempts);
  const email = useSession((s) => s.email);
  const name = useSession((s) => s.name);
  const studentKey = email || name || "student";
  const weeklyExams = useCbtStore((s) => s.weeklyExams);
  const adminExams = useCbtStore((s) => s.adminExams);

  // Student's 3 elective subjects (default to physics, chemistry, biology)
  const candidateElectives = useMemo(() => {
    if (Array.isArray(jamb) && jamb.length === 3) {
      return jamb.map((s) => s.toLowerCase());
    }
    return ["physics", "chemistry", "biology"];
  }, [jamb]);

  // Full 4-subject candidate combination: Use of English + 3 electives
  const candidateSubjects = useMemo(() => {
    return ["english", ...candidateElectives] as JambSectionSubject[];
  }, [candidateElectives]);

  // Only consider published or available Weekly examinations from admin/weekly store
  const publishedExams = useMemo(() => {
    const list: AdminJambExam[] = [];
    const seen = new Set<string>();

    for (const e of adminExams) {
      if (e.type === "weekly_jamb" && isExamPublishedOrAvailable(e.status)) {
        list.push(e);
        seen.add(e.id);
      }
    }

    // Also check weeklyExams if not present in adminExams
    for (const we of weeklyExams) {
      if (!seen.has(we.id) && isExamPublishedOrAvailable(we.status)) {
        list.push({
          id: we.id,
          type: "weekly_jamb",
          title: we.title,
          weekOrPeriod: "Weekly Series",
          instructions: we.description,
          durationMinutes: we.durationMinutes,
          startAt: we.startAt,
          endAt: we.endAt,
          status: "published",
          createdAt: we.createdAt,
          updatedAt: we.createdAt,
          sections: we.sections || ({} as any),
        });
        seen.add(we.id);
      }
    }

    return list;
  }, [adminExams, weeklyExams]);

  // Find the primary Weekly JAMB examination for Section A
  const nextWeeklyExam = useMemo(() => {
    const weeklyList = publishedExams.filter((e) => e.type === "weekly_jamb");
    if (weeklyList.length === 0) return publishedExams[0] || null;

    // Prioritize an open exam
    const openExam = weeklyList.find((e) => {
      const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
      return state === "open";
    });
    if (openExam) return openExam;

    // Next prioritize an upcoming exam
    const upcomingExam = weeklyList.find((e) => {
      const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
      return state === "coming_soon";
    });
    if (upcomingExam) return upcomingExam;

    return weeklyList[0];
  }, [publishedExams]);

  const nextExam = nextWeeklyExam;

  const nextExamLifecycle = nextExam
    ? getExamLifecycleState(nextExam.startAt, nextExam.endAt, nextExam.status)
    : null;

  // Track next scheduled exam if different from active open exam
  const upcomingScheduledExam = useMemo(() => {
    return publishedExams.find((e) => {
      if (e.id === nextWeeklyExam?.id) return false;
      const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
      return state === "coming_soon";
    }) || null;
  }, [publishedExams, nextWeeklyExam]);

  // Real-time countdown timer tick for upcoming exam
  const [timeUntilStart, setTimeUntilStart] = useState<string>("");
  const [upcomingCountdown, setUpcomingCountdown] = useState<string>("");

  useEffect(() => {
    if (!nextExam || nextExamLifecycle !== "coming_soon") return;

    const tick = () => {
      const now = Date.now();
      const startMs = new Date(nextExam.startAt).getTime();
      const diffSec = Math.max(0, Math.floor((startMs - now) / 1000));

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      if (days > 0) {
        setTimeUntilStart(`${days}d ${hours}h ${mins}m`);
      } else {
        setTimeUntilStart(`${hours}h ${mins}m ${secs}s`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextExam, nextExamLifecycle]);

  useEffect(() => {
    if (!upcomingScheduledExam) {
      setUpcomingCountdown("");
      return;
    }

    const tick = () => {
      const now = Date.now();
      const startMs = new Date(upcomingScheduledExam.startAt).getTime();
      const diffSec = Math.max(0, Math.floor((startMs - now) / 1000));

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      if (days > 0) {
        setUpcomingCountdown(`${days}d ${hours}h ${mins}m`);
      } else {
        setUpcomingCountdown(`${hours}h ${mins}m ${secs}s`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [upcomingScheduledExam]);

  // Check in-progress attempt for active weekly exam
  const [inProgressWeekly, setInProgressWeekly] = useState(false);
  const [inProgressRemainingSec, setInProgressRemainingSec] = useState<number>(0);

  useEffect(() => {
    if (!nextExam) {
      setInProgressWeekly(false);
      return;
    }
    try {
      const active =
        localStorage.getItem(`richmirabel_weekly_active_${studentKey}_${nextExam.id}`) ||
        localStorage.getItem(`richmirabel_weekly_active_${nextExam.id}`);
      const endsAtStr =
        localStorage.getItem(`richmirabel_weekly_ends_at_${studentKey}_${nextExam.id}`) ||
        localStorage.getItem(`richmirabel_weekly_ends_at_${nextExam.id}`);
      const endsAt = Number(endsAtStr);
      if (active === "true" && endsAt && Date.now() < endsAt) {
        setInProgressWeekly(true);
        setInProgressRemainingSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
      } else {
        setInProgressWeekly(false);
      }
    } catch {
      setInProgressWeekly(false);
    }
  }, [nextExam, studentKey]);

  // Existing attempt for next exam
  const existingNextAttempt = nextExam
    ? attempts.find((a) => a.topicId === nextExam.id || a.paperId === nextExam.id)
    : null;

  // Student CBT attempts history
  const jambAttempts = useMemo(() => {
    return attempts.filter((a) => a.kind === "jamb");
  }, [attempts]);

  // Calculate real metrics from student's completed CBT attempts
  const performanceMetrics = useMemo(() => {
    if (jambAttempts.length === 0) return null;

    const totalAttempts = jambAttempts.length;
    const latestAttempt = jambAttempts[0];

    let totalScoreAll = 0;
    let totalPossibleAll = 0;

    const subjectBreakdown: Record<string, { correct: number; total: number }> = {};

    for (const att of jambAttempts) {
      totalScoreAll += att.score;
      totalPossibleAll += att.total;

      if (Array.isArray(att.items)) {
        for (const item of att.items) {
          if (!item.id) continue;
          const match = item.id.match(/^(english|mathematics|physics|chemistry|biology)_/i);
          const subjKey = match ? match[1].toLowerCase() : null;
          if (!subjKey) continue;

          if (!subjectBreakdown[subjKey]) {
            subjectBreakdown[subjKey] = { correct: 0, total: 0 };
          }
          subjectBreakdown[subjKey].total += 1;
          if (item.pick && item.answer && item.pick === item.answer) {
            subjectBreakdown[subjKey].correct += 1;
          }
        }
      }
    }

    const overallAccuracy = totalPossibleAll > 0 ? Math.round((totalScoreAll / totalPossibleAll) * 100) : 0;

    return {
      totalAttempts,
      latestAttempt,
      overallAccuracy,
      subjectBreakdown,
    };
  }, [jambAttempts]);

  // Published Weekly Exams
  const filteredLibraryExams = publishedExams;

  return (
    <div className="mx-auto max-w-4xl space-y-10 py-2 font-sans">
      {/* ========================================================================= */}
      {/* SECTION 1: PERSONALIZED CANDIDATE COMBINATION BANNER                     */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-stone-200 bg-[#FCFAF7] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#1A4D2E]" />
            <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
              Your Verified Candidate Combination
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {candidateSubjects.map((subjKey, i) => (
              <span
                key={subjKey}
                className="px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5 shadow-2xs"
              >
                <span className="size-1.5 rounded-full bg-[#1A4D2E]" />
                {i === 0 ? "Use of English (Compulsory)" : JAMB_SUBJECT_LABELS[subjKey]}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-stone-500 font-sans">
            Paper assembled exclusively from your 4 registered UTME subjects (180 Questions Total · 120 Mins).
          </p>
        </div>

        <Link
          to="/studio/account"
          className="shrink-0 text-xs font-bold text-[#1A4D2E] hover:underline bg-stone-100 px-4 py-2 rounded-full border border-stone-200 text-center"
        >
          Change electives
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: NEXT SCHEDULED EXAMINATION HERO COUNTDOWN                      */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-[#E5E0D8] bg-white p-7 sm:p-9 shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="size-3.5" />
            Next Scheduled Examination
          </span>
          <span className="text-xs text-stone-500 font-mono">Timezone: Africa/Lagos (WAT)</span>
        </div>

        {!nextExam ? (
          /* STATE A: NO EXAM SCHEDULED */
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center space-y-3">
            <div className="size-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Calendar className="size-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-800">No Upcoming Examination Published</h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed font-sans">
              No weekly examination is currently open or scheduled. The administrator publishes new 5-subject Weekly JAMB tests regularly. Check back shortly!
            </p>
          </div>
        ) : (
          /* STATE B: SCHEDULED / OPEN / COMPLETED */
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    existingNextAttempt
                      ? "bg-stone-100 text-stone-800"
                      : inProgressWeekly
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : nextExamLifecycle === "open"
                      ? "bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300"
                      : nextExamLifecycle === "coming_soon"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-stone-100 text-stone-700"
                  )}
                >
                  {existingNextAttempt
                    ? "SUBMITTED"
                    : inProgressWeekly
                    ? "IN PROGRESS"
                    : nextExamLifecycle === "open"
                    ? "AVAILABLE"
                    : nextExamLifecycle === "coming_soon"
                    ? "UPCOMING / LOCKED"
                    : "CLOSED"}
                </span>
                <span className="text-xs font-semibold text-[#1A4D2E]">
                  Weekly JAMB CBT
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-bold">
                {nextExam.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 font-sans">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-stone-400" />
                  <span>Scheduled: {formatLagosDateTime(nextExam.startAt)}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-stone-400" />
                  <span>{nextExam.durationMinutes} Minutes (180 Questions)</span>
                </span>
              </div>
            </div>

            {/* Live Countdown Box for Upcoming Locked Exam */}
            {nextExamLifecycle === "coming_soon" && !existingNextAttempt && !inProgressWeekly && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-900">
                  <Clock className="size-4 text-blue-600 shrink-0" />
                  <span>Countdown to Examination Window Opening:</span>
                </div>
                <strong className="font-mono text-base font-bold text-blue-950 bg-white px-3.5 py-1 rounded-xl border border-blue-200 shadow-2xs">
                  {timeUntilStart || "Calculating..."}
                </strong>
              </div>
            )}

            {/* Primary Action Button for Weekly Examination */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {existingNextAttempt ? (
                <Link
                  to="/studio/review/$attemptId"
                  params={{ attemptId: existingNextAttempt.id }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-8 text-xs font-bold text-stone-900 hover:bg-stone-50 transition-colors shadow-xs"
                >
                  <CheckCircle2 className="size-4 text-[#1A4D2E]" />
                  <span>View Examination Result ({existingNextAttempt.score}/{existingNextAttempt.total})</span>
                </Link>
              ) : inProgressWeekly ? (
                <Link
                  to="/studio/cbt/weekly/$examId"
                  params={{ examId: nextExam.id }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-600 px-8 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs animate-pulse"
                >
                  <Clock className="size-4" />
                  <span>Resume In-Progress Examination ({Math.floor(inProgressRemainingSec / 60)}m left)</span>
                </Link>
              ) : nextExamLifecycle === "open" ? (
                <Link
                  to="/studio/cbt/weekly/$examId"
                  params={{ examId: nextExam.id }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-8 text-xs font-bold text-white hover:bg-[#153e25] transition-colors shadow-xs"
                >
                  <PenLine className="size-4" />
                  <span>Start Weekly Examination</span>
                </Link>
              ) : nextExamLifecycle === "coming_soon" ? (
                <Link
                  to="/studio/cbt/weekly/$examId"
                  params={{ examId: nextExam.id }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-blue-300 bg-blue-50/80 px-6 text-xs font-bold text-blue-900 hover:bg-blue-100 transition-colors"
                >
                  <Lock className="size-4 text-blue-600" />
                  <span>View Instructions & Details</span>
                </Link>
              ) : (
                <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-stone-100 px-6 text-xs font-semibold text-stone-500">
                  <Lock className="size-4 text-stone-400" /> Examination Window Closed
                </span>
              )}
            </div>

            {/* Upcoming Next Scheduled Examination Notice (when current exam is active) */}
            {upcomingScheduledExam && nextExamLifecycle === "open" && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="size-2 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-950 block">
                      Next Scheduled Paper: {upcomingScheduledExam.title}
                    </span>
                    <span className="text-[11px] text-blue-800">
                      Releases on {formatLagosDateTime(upcomingScheduledExam.startAt)} (Countdown: {upcomingCountdown || "calculating..."})
                    </span>
                  </div>
                </div>

                <Link
                  to="/studio/cbt/weekly/$examId"
                  params={{ examId: upcomingScheduledExam.id }}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border border-blue-300 bg-white text-blue-900 font-semibold hover:bg-blue-50 text-center text-[11px]"
                >
                  View Details →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>



      {/* ========================================================================= */}
      {/* SECTION 3: MY PERFORMANCE                                                */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-bold">
              My Performance
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-sans">
            {jambAttempts.length} Completed {jambAttempts.length === 1 ? "Exam" : "Exams"}
          </span>
        </div>

        {!performanceMetrics ? (
          /* FIRST-EXAM EMPTY STATE */
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center space-y-3">
            <Trophy className="size-10 text-stone-400 mx-auto opacity-60" />
            <h3 className="font-serif text-base font-bold text-stone-800">No Exam Attempts Recorded Yet</h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed font-sans">
              Take your first 180-question Weekly JAMB CBT examination to generate personalized subject performance metrics and AI diagnostic reviews.
            </p>
            {nextExam && (
              <div className="pt-1">
                <Link
                  to="/studio/cbt/weekly/$examId"
                  params={{ examId: nextExam.id }}
                  className="inline-flex min-h-10 items-center gap-1.5 px-5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
                >
                  <PenLine className="size-3.5" /> Start Weekly CBT Exam
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* PERFORMANCE METRICS GRID */
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Latest UTME Score</span>
                <strong className="font-serif text-2xl font-bold text-[#1A4D2E]">
                  {getAttemptUtmeResult(performanceMetrics.latestAttempt).utmeScore} / 400
                </strong>
                <span className="text-[11px] font-semibold text-stone-600 block">
                  {getAttemptUtmeResult(performanceMetrics.latestAttempt).accuracy}% Accuracy ({getAttemptUtmeResult(performanceMetrics.latestAttempt).rawCorrect}/180)
                </span>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Completed Exams</span>
                <strong className="font-serif text-2xl font-bold text-stone-900">
                  {performanceMetrics.totalAttempts}
                </strong>
                <span className="text-[11px] text-stone-500 block">Saved Attempts</span>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-stone-200 bg-white p-4 text-center space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Overall Accuracy</span>
                <strong className="font-serif text-2xl font-bold text-emerald-800">
                  {performanceMetrics.overallAccuracy}%
                </strong>
                <span className="text-[11px] text-emerald-700 block">Across All Papers</span>
              </div>
            </div>

            {/* Subject-by-Subject Performance Breakdown */}
            {Object.keys(performanceMetrics.subjectBreakdown).length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 shadow-2xs font-sans">
                <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px] block">
                  Subject-by-Subject Accuracy (Attempted Papers):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {candidateSubjects.map((subKey) => {
                    const data = performanceMetrics.subjectBreakdown[subKey];
                    const pct = data && data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;

                    return (
                      <div key={subKey} className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 space-y-1 text-xs">
                        <span className="font-bold text-stone-800 truncate block">
                          {JAMB_SUBJECT_LABELS[subKey]}
                        </span>
                        {pct !== null ? (
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-serif font-bold text-stone-900 text-sm">{pct}%</span>
                            <span className="text-[10px] text-stone-500 font-mono">{data.correct}/{data.total} Qs</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic block pt-1">No attempts yet</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: WEEKLY EXAMINATION ARCHIVE                                     */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-bold">
              Weekly Examination Archive
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-sans">
            {publishedExams.length} {publishedExams.length === 1 ? "Paper Available" : "Papers Available"}
          </span>
        </div>

        {filteredLibraryExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center space-y-2">
            <Lock className="size-8 text-stone-400 mx-auto opacity-60" />
            <h3 className="font-serif font-bold text-base text-stone-800">No Published Weekly Exams</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto font-sans leading-relaxed">
              Published administrator weekly examinations will be listed here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLibraryExams.map((exam) => {
              const lifecycle = getExamLifecycleState(exam.startAt, exam.endAt, exam.status);
              const att = attempts.find((a) => a.topicId === exam.id || a.paperId === exam.id);

              return (
                <div
                  key={exam.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          att
                            ? "bg-stone-100 text-stone-800"
                            : lifecycle === "open"
                            ? "bg-emerald-100 text-emerald-800"
                            : lifecycle === "coming_soon"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-stone-100 text-stone-700"
                        )}
                      >
                        {att ? "Completed" : lifecycle === "open" ? "Available Now" : lifecycle === "coming_soon" ? "Upcoming" : "Closed"}
                      </span>
                      <span className="text-xs font-semibold text-[#1A4D2E]">
                        Weekly JAMB CBT
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-stone-900">{exam.title}</h3>

                    <p className="text-xs text-stone-500 font-sans">
                      Scheduled: {formatLagosDateTime(exam.startAt)} · {exam.durationMinutes} Minutes · 180 Questions
                    </p>
                  </div>

                  <div className="shrink-0 pt-1 sm:pt-0">
                    {att ? (
                      <Link
                        to="/studio/review/$attemptId"
                        params={{ attemptId: att.id }}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50"
                      >
                        <span>View Result ({att.score}/{att.total})</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to="/studio/cbt/weekly/$examId"
                        params={{ examId: exam.id }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-colors",
                          lifecycle === "open" || lifecycle === "coming_soon"
                            ? "bg-[#1A4D2E] text-white hover:bg-[#153e25]"
                            : "border border-stone-200 text-stone-800 hover:bg-stone-50"
                        )}
                      >
                        <span>{lifecycle === "open" || lifecycle === "coming_soon" ? "Enter Exam" : "View Details"}</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: EXAMINATION HISTORY & PAST RESULTS                             */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <History className="size-5 text-[#1A4D2E]" />
            <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-bold">
              Examination History
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-sans">
            {jambAttempts.length} Total Saved {jambAttempts.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {jambAttempts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center space-y-2">
            <History className="size-8 text-stone-400 mx-auto opacity-60" />
            <h3 className="font-serif font-bold text-base text-stone-800">No Historical Attempts Yet</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto font-sans leading-relaxed">
              Your completed CBT examination submissions and AI attempt reviews will be saved here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-2xs font-sans">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Examination Paper</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Score Achieved</th>
                  <th className="px-4 py-3.5">Accuracy</th>
                  <th className="px-5 py-3.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {jambAttempts.map((att) => {
                  const res = getAttemptUtmeResult(att);
                  const dateStr = new Date(att.at).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={att.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-4 font-semibold text-stone-900">
                        <div className="font-serif text-sm font-bold text-stone-900">{att.title}</div>
                        <span className="text-[11px] text-stone-500 font-normal">{att.subjectLabel || "JAMB CBT"}</span>
                      </td>

                      <td className="px-4 py-4 text-stone-600 text-xs">
                        {dateStr}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-serif text-base font-bold text-[#1A4D2E]">
                          {res.utmeScore} / 400
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          Raw: {res.rawCorrect} / {res.rawTotal} Qs
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                          res.accuracy >= 70 ? "bg-emerald-100 text-emerald-800" : res.accuracy >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        )}>
                          {res.accuracy}%
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to="/studio/review/$attemptId"
                          params={{ attemptId: att.id }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4D2E] hover:underline"
                        >
                          <span>Review Attempt</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

