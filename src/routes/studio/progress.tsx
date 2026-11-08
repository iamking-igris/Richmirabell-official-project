import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { attemptsByKind } from "@/lib/assessment";
import { publishedSubjects, useContent } from "@/lib/content";
import { plural } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";
import { getAttemptUtmeResult } from "@/lib/utme-scoring";
import { cn } from "@/lib/cn";
import { Award, CheckCircle2, TrendingUp, Sparkles, Clock, BookOpen, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/studio/progress")({ component: ProgressPage });

export function ProgressPage() {
  const attempts = useSession((s) => s.attempts);
  const selected = useSession((s) => s.selectedSubjects);
  const best = bestByTopic(attempts);
  const all = publishedSubjects(useContent((s) => s.subjects));
  const mine = (selected.length ? selected : []).map((id) => all.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const { topic: topicAttempts, jamb, waec } = attemptsByKind(attempts);

  // Weekly JAMB CBT attempts
  const weeklyJambAttempts = useMemo(() => {
    return jamb;
  }, [jamb]);

  // Compute CBT subject-level averages across all CBT attempts
  const cbtSubjectStats = useMemo(() => {
    const map: Record<string, { label: string; correct: number; total: number }> = {};

    for (const a of jamb) {
      if (!a.items?.length) continue;
      for (const it of a.items) {
        const rawSub = (it as any).subjectId || (it as any).subject || "general";
        const subKey = String(rawSub).toLowerCase();

        let label = (it as any).subject || "";
        if (!label || label === "General") {
          if (subKey === "english") label = "Use of English";
          else if (subKey === "mathematics" || subKey === "math") label = "Mathematics";
          else if (subKey === "physics") label = "Physics";
          else if (subKey === "chemistry") label = "Chemistry";
          else if (subKey === "biology") label = "Biology";
          else label = subKey.charAt(0).toUpperCase() + subKey.slice(1);
        }

        if (!map[subKey]) {
          map[subKey] = { label, correct: 0, total: 0 };
        }
        map[subKey].total += 1;
        if (it.answer != null && it.pick === it.answer) {
          map[subKey].correct += 1;
        }
      }
    }

    return Object.entries(map).map(([key, val]) => {
      const pct = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
      return { key, label: val.label, correct: val.correct, total: val.total, pct };
    });
  }, [jamb]);

  // Subject cards for curriculum syllabus topics
  const syllabusCards = mine.map((subject) => {
    const rows = subject.topics.map((topic) => best.get(topic.id)).filter(Boolean);
    const attempted = subject.topics.filter((t) => best.has(t.id)).length;
    const avg = rows.length ? Math.round(rows.reduce((s, a) => s + (a!.score / Math.max(a!.total, 1)) * 100, 0) / rows.length) : null;
    return { subject, attempted, avg };
  });

  return (
    <div className="pb-16 space-y-10 font-sans">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2422]">Student Performance Centre</h1>
        <p className="mt-2 max-w-xl text-sm text-stone-600 font-sans leading-relaxed">
          {attempts.length === 0
            ? "No examination attempts recorded yet. Begin with this week's CBT or sit a topic quiz."
            : `${plural(weeklyJambAttempts.length, "Weekly CBT paper")} · ${plural(topicAttempts.length, "topic quiz")} · ${plural(waec.length, "WAEC paper")}`}
        </p>
      </div>

      {/* CBT Examination Performance Cards (Section 10) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#1A4D2E]">JAMB CBT Examinations</h2>
          <Link to="/studio/cbt" className="text-xs font-bold text-[#1A4D2E] hover:underline flex items-center gap-1">
            Open CBT Hub <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {/* Weekly Examination Performance Card */}
        <div className="rounded-3xl border border-[#E5E0D8] bg-[#FDFBF7] p-6 sm:p-7 shadow-xs space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-bold uppercase tracking-wider">
                Weekly JAMB Examination Series
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {plural(weeklyJambAttempts.length, "attempt")}
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#2A2422]">Weekly Examination Papers</h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
              Official 180-question weekly papers covering Use of English and your 3 registered elective subjects under a strict 120-minute countdown with automatic 400-point UTME grading.
            </p>
          </div>

          {weeklyJambAttempts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Latest Paper Score</span>
                <p className="font-serif text-2xl font-bold text-[#1A4D2E] mt-1">
                  {getAttemptUtmeResult(weeklyJambAttempts[0]).utmeScore} / 400
                </p>
                <p className="text-[11px] text-stone-600 font-medium">
                  {getAttemptUtmeResult(weeklyJambAttempts[0]).accuracy}% Accuracy ({getAttemptUtmeResult(weeklyJambAttempts[0]).rawCorrect}/180 Qs)
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Best Performance</span>
                <p className="font-serif text-2xl font-bold text-emerald-800 mt-1">
                  {Math.max(...weeklyJambAttempts.map((a) => getAttemptUtmeResult(a).utmeScore))} / 400
                </p>
                <p className="text-[11px] text-stone-600 font-medium font-sans">Recorded High</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Papers Completed</span>
                <p className="font-serif text-2xl font-bold text-stone-900 mt-1">
                  {weeklyJambAttempts.length}
                </p>
                <p className="text-[11px] text-stone-500 font-sans">Weekly Series Attempts</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white/60 p-5 text-center text-xs text-stone-500">
              No weekly examination papers submitted yet. Check the CBT Hub to sit this week's scheduled paper.
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center gap-3">
            <Link
              to="/studio/cbt"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white hover:bg-[#153e25] transition-colors shadow-xs"
            >
              Go to Weekly CBT Hub →
            </Link>
            {weeklyJambAttempts.length > 0 && (
              <Link
                to="/studio/review/$attemptId"
                params={{ attemptId: weeklyJambAttempts[0].id }}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 underline px-2 py-1"
              >
                Review Latest Attempt
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CBT Subject-Level Score Averages (Section 10) */}
      {cbtSubjectStats.length > 0 && (
        <section className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#2A2422]">CBT Subject Accuracy Averages</h2>
            <p className="text-xs text-stone-600 mt-1">
              Aggregated accuracy calculated from all your multiple-choice responses across Weekly JAMB examinations.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cbtSubjectStats.map((sub) => (
              <div key={sub.key} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-sm text-stone-900">{sub.label}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    sub.pct >= 70 ? "bg-emerald-100 text-emerald-800" : sub.pct >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                  )}>
                    {sub.pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      sub.pct >= 70 ? "bg-emerald-600" : sub.pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${Math.max(5, sub.pct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  {sub.correct} of {sub.total} questions answered correctly
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Syllabus Registered Subjects */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2A2422]">Your Syllabus Curriculum Subjects</h2>
        {syllabusCards.length === 0 ? (
          <p className="text-xs text-stone-500">Choose your four subjects in Account settings.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {syllabusCards.map(({ subject, attempted, avg }) => (
              <li key={subject.id} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                <p className="font-serif font-bold text-base text-stone-900">{subject.name}</p>
                <p className="text-xs text-stone-500">
                  {attempted === 0 ? "Not started" : `${attempted} of ${subject.topics.length} topics · best ${avg}%`}
                </p>
                <Link
                  to="/studio/subject/$id"
                  params={{ id: subject.id }}
                  className="mt-2 inline-flex text-xs font-bold text-[#1A4D2E] hover:underline"
                >
                  Open subject notes →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Past CBT and WAEC Examination Attempts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#2A2422]">Examination Attempts Log</h2>
          <span className="text-xs text-stone-500">{jamb.length + waec.length} papers completed</span>
        </div>

        {jamb.length + waec.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-xs text-stone-500">
            No examination papers submitted yet. Take this week's JAMB CBT or sit a WAEC past paper.
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {[...jamb, ...waec].map((a) => {
              const isJamb = a.kind === "jamb";
              const res = isJamb ? getAttemptUtmeResult(a) : null;

              return (
                <li key={a.id}>
                  <Link
                    to="/studio/review/$attemptId"
                    params={{ attemptId: a.id }}
                    className="flex min-h-14 items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors"
                  >
                    <div>
                      <span className="block font-medium text-sm text-stone-900">{a.title}</span>
                      <span className="text-xs text-stone-500 font-sans">
                        {a.subjectLabel || a.kind.toUpperCase()} · {new Date(a.at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-[#1A4D2E] font-serif">
                        {isJamb && res ? `${res.utmeScore} / 400` : `${a.score} / ${a.total}`}
                      </span>
                      <span className="text-xs font-bold text-[#1A4D2E]">Review Diagnostics →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Topic Quiz Attempts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#2A2422]">Topic Quiz Assessments</h2>
          <span className="text-xs text-stone-500">{topicAttempts.length} quizzes</span>
        </div>

        {topicAttempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-xs text-stone-500">
            No topic quiz assessments yet. Study any syllabus topic note and take its quick quiz to verify comprehension.
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {topicAttempts.map((a) => (
              <li key={a.id}>
                <Link
                  to="/studio/review/$attemptId"
                  params={{ attemptId: a.id }}
                  className="flex min-h-14 items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <span className="block font-medium text-sm text-stone-900">{a.title}</span>
                    <span className="text-xs text-stone-500 font-sans">
                      Topic Quiz · {new Date(a.at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-stone-900">
                      {a.score} / {a.total}
                    </span>
                    <span className="text-xs font-bold text-[#1A4D2E]">Review →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
